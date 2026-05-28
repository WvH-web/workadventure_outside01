import "./main-1d30c8f5.js";

const MEGAPHONE_LAYER_NAME = "megaphoneZones";
const SPEAKER_BADGE_URL = new URL("megaphone-speaker-badge.html", import.meta.url).toString();
const MUSEUM_BOARD_URL = new URL("museum-board.html", import.meta.url).toString();
const MUSEUM_BOARD_NAME_PATTERN = /^show([1-9]|1[0-3])$/;
const SYNCED_SPACE_PROPERTIES = [
  "cameraState",
  "microphoneState",
  "screenSharingState",
  "megaphoneState",
];

const activeZones = new Map();
const activeSpaces = new Map();
let speakerBadge;

function getProperty(properties, name) {
  return (properties || []).find((property) => property.name === name)?.value;
}

function findMegaphoneObjects(layers, result = []) {
  for (const layer of layers || []) {
    if (layer.type === "group") {
      findMegaphoneObjects(layer.layers, result);
      continue;
    }

    if (layer.type !== "objectgroup" || layer.name !== MEGAPHONE_LAYER_NAME) {
      continue;
    }

    for (const object of layer.objects || []) {
      const role = getProperty(object.properties, "megaphoneRole");
      const spaceName = getProperty(object.properties, "megaphoneSpace");
      if ((role === "speaker" || role === "listener") && typeof spaceName === "string") {
        result.push({ object, role, spaceName });
      }
    }
  }
  return result;
}

function findMuseumBoardObjects(layers, result = []) {
  for (const layer of layers || []) {
    if (layer.type === "group") {
      findMuseumBoardObjects(layer.layers, result);
      continue;
    }

    if (layer.type !== "objectgroup") {
      continue;
    }

    for (const object of layer.objects || []) {
      if (MUSEUM_BOARD_NAME_PATTERN.test(object.name || "") && object.width && object.height) {
        result.push(object);
      }
    }
  }
  return result;
}

async function renderMuseumBoard(object) {
  const name = `museum-board-${object.name}`;
  const url = new URL(MUSEUM_BOARD_URL);
  url.searchParams.set("board", object.name);

  await WA.room.website.delete(name).catch(() => undefined);
  WA.room.website.create({
    name,
    url: url.toString(),
    position: {
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
    },
    visible: true,
    origin: "map",
  });
}

async function showSpeakerBadge() {
  if (speakerBadge) {
    speakerBadge.visible = true;
    return;
  }

  speakerBadge = await WA.ui.website.open({
    url: SPEAKER_BADGE_URL,
    visible: true,
    position: { vertical: "top", horizontal: "middle" },
    size: { width: "300px", height: "76px" },
    margin: { top: "96px" },
  });
}

function hideSpeakerBadge() {
  if (speakerBadge) {
    speakerBadge.visible = false;
  }
}

async function enterMegaphoneZone(areaName, role, spaceName) {
  if (activeZones.has(areaName)) {
    return;
  }

  if (!WA.spaces?.joinSpace) {
    console.error("WorkAdventure Spaces API is not available; TMJ megaphone zone skipped.");
    return;
  }

  let activeSpace = activeSpaces.get(spaceName);
  if (!activeSpace) {
    const space = await WA.spaces.joinSpace(
      `tmj-megaphone-${spaceName}`,
      "streaming",
      SYNCED_SPACE_PROPERTIES
    );
    activeSpace = { space, listeners: 0, speakers: 0 };
    activeSpaces.set(spaceName, activeSpace);
  }

  if (role === "speaker") {
    activeSpace.speakers += 1;
    if (activeSpace.speakers === 1) {
      activeSpace.space.startStreaming();
    }
    await showSpeakerBadge();
  } else {
    activeSpace.listeners += 1;
  }

  activeZones.set(areaName, { role, spaceName });
}

function leaveMegaphoneZone(areaName) {
  const activeZone = activeZones.get(areaName);
  if (!activeZone) {
    return;
  }

  const activeSpace = activeSpaces.get(activeZone.spaceName);
  if (!activeSpace) {
    activeZones.delete(areaName);
    return;
  }

  if (activeZone.role === "speaker") {
    activeSpace.speakers = Math.max(0, activeSpace.speakers - 1);
    if (activeSpace.speakers === 0) {
      activeSpace.space.stopStreaming();
    }
  } else {
    activeSpace.listeners = Math.max(0, activeSpace.listeners - 1);
  }

  if (activeSpace.speakers === 0 && activeSpace.listeners === 0) {
    activeSpace.space.leave();
    activeSpaces.delete(activeZone.spaceName);
  }
  activeZones.delete(areaName);

  const speakerStillActive = [...activeSpaces.values()].some((space) => space.speakers > 0);
  if (!speakerStillActive) {
    hideSpeakerBadge();
  }
}

WA.onInit()
  .then(async () => {
    const map = await WA.room.getTiledMap();
    const megaphoneObjects = findMegaphoneObjects(map.layers);

    for (const { object, role, spaceName } of megaphoneObjects) {
      WA.room.area.onEnter(object.name).subscribe(() => {
        enterMegaphoneZone(object.name, role, spaceName).catch((error) => {
          console.error(`Could not enter megaphone zone "${object.name}"`, error);
        });
      });

      WA.room.area.onLeave(object.name).subscribe(() => {
        leaveMegaphoneZone(object.name);
      });
    }

    console.info(`TMJ megaphone zones ready: ${megaphoneObjects.length}`);
  })
  .catch((error) => console.error("TMJ megaphone initialization failed", error));

WA.onInit()
  .then(async () => {
    const map = await WA.room.getTiledMap();
    const boardObjects = findMuseumBoardObjects(map.layers);

    await Promise.all(boardObjects.map((object) => renderMuseumBoard(object)));
    console.info(`Museum showroom boards ready: ${boardObjects.length}`);
  })
  .catch((error) => console.error("Museum showroom board initialization failed", error));
