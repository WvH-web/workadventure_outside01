import "./main-1d30c8f5.js";

const MEGAPHONE_LAYER_NAME = "megaphoneZones";
const SPEAKER_BADGE_URL = new URL("megaphone-speaker-badge.html", import.meta.url).toString();
const MUSEUM_BOARD_URL = new URL("museum-board.html", import.meta.url).toString();
const MUSEUM_API_URL =
  "https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum.php";
const MUSEUM_BOARD_NAME_PATTERN = /^show([1-9]|1[0-3])$/;
const MUSEUM_BOARD_OBJECT_LAYER_NAME = "museumBoards";
const MUSEUM_BOARD_OBJECT_NAME_PATTERN = /^museumBoard_(show([1-9]|1[0-3]))$/;
const MUSEUM_SHOWROOM_AREA_NAME = "showroom";
const MUSEUM_BOARD_RECTS = {
  show1: { x: 4112, y: 2580, width: 145, height: 62 },
  show2: { x: 4318, y: 2580, width: 145, height: 62 },
  show3: { x: 4461, y: 2580, width: 145, height: 62 },
  show4: { x: 4175, y: 2352, width: 145, height: 62 },
  show5: { x: 4382, y: 2250, width: 145, height: 62 },
  show6: { x: 4175, y: 2101, width: 145, height: 62 },
  show7: { x: 4383, y: 2101, width: 145, height: 62 },
  show8: { x: 4382, y: 1968, width: 145, height: 62 },
  show9: { x: 4461, y: 1820, width: 145, height: 62 },
  show10: { x: 4114, y: 1820, width: 145, height: 62 },
  show11: { x: 4174, y: 1719, width: 145, height: 62 },
  show12: { x: 4318, y: 1719, width: 145, height: 62 },
  show13: { x: 4461, y: 1719, width: 145, height: 62 },
};
const SYNCED_SPACE_PROPERTIES = [
  "cameraState",
  "microphoneState",
  "screenSharingState",
  "megaphoneState",
];

const activeZones = new Map();
const activeSpaces = new Map();
let speakerBadge;
const museumBoardWebsites = [];

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

function findMuseumBoardConfigs(layers, result = []) {
  for (const layer of layers || []) {
    if (layer.type === "group") {
      findMuseumBoardConfigs(layer.layers, result);
      continue;
    }

    if (layer.type !== "objectgroup" || layer.name !== MUSEUM_BOARD_OBJECT_LAYER_NAME) {
      continue;
    }

    for (const object of layer.objects || []) {
      const boardName = getProperty(object.properties, "board");
      const objectNameMatch = MUSEUM_BOARD_OBJECT_NAME_PATTERN.exec(object.name || "");
      const resolvedBoardName = typeof boardName === "string" ? boardName : objectNameMatch?.[1];
      if (MUSEUM_BOARD_NAME_PATTERN.test(resolvedBoardName || "") && object.width && object.height) {
        result.push({
          boardName: resolvedBoardName,
          rect: { x: object.x, y: object.y, width: object.width, height: object.height },
        });
      }
    }
  }
  return result;
}

function findShowBoardConfigs(layers, result = []) {
  for (const layer of layers || []) {
    if (layer.type === "group") {
      findShowBoardConfigs(layer.layers, result);
      continue;
    }

    if (layer.type !== "objectgroup") {
      continue;
    }

    for (const object of layer.objects || []) {
      if (MUSEUM_BOARD_NAME_PATTERN.test(object.name || "") && object.width && object.height) {
        result.push({
          boardName: object.name,
          rect: { x: object.x, y: object.y, width: object.width, height: object.height },
        });
      }
    }
  }
  return result;
}

function getMuseumBoardConfigs(layers) {
  const boardLayerConfigs = findMuseumBoardConfigs(layers);
  if (boardLayerConfigs.length > 0) {
    return boardLayerConfigs;
  }

  const showObjectConfigs = findShowBoardConfigs(layers);
  if (showObjectConfigs.length > 0) {
    return showObjectConfigs;
  }

  return Object.entries(MUSEUM_BOARD_RECTS).map(([boardName, rect]) => ({ boardName, rect }));
}

function findAreaObject(layers, areaName) {
  for (const layer of layers || []) {
    if (layer.type === "group") {
      const object = findAreaObject(layer.layers, areaName);
      if (object) {
        return object;
      }
      continue;
    }

    if (layer.type !== "objectgroup") {
      continue;
    }

    const object = (layer.objects || []).find((candidate) => candidate.name === areaName);
    if (object) {
      return object;
    }
  }
}

function isInsideRect(position, rect) {
  return (
    position.x >= rect.x &&
    position.x <= rect.x + rect.width &&
    position.y >= rect.y &&
    position.y <= rect.y + rect.height
  );
}

async function getMuseumBoardImageUrl(boardName) {
  const url = new URL(MUSEUM_API_URL);
  url.searchParams.set("board", boardName);
  url.searchParams.set("_", String(Date.now()));

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Museum API returned ${response.status} for ${boardName}`);
  }

  const data = await response.json();
  const imageUrl = data?.item?.image_url;
  return typeof imageUrl === "string" && imageUrl.trim() !== "" ? imageUrl : undefined;
}

async function renderMuseumBoard(boardName, rect, visible) {
  const imageUrl = await getMuseumBoardImageUrl(boardName);
  if (!imageUrl) {
    return;
  }

  const name = `museum-board-${boardName}`;
  const url = new URL(MUSEUM_BOARD_URL);
  url.searchParams.set("board", boardName);
  url.searchParams.set("image", imageUrl);

  await WA.room.website.delete(name).catch(() => undefined);
  const website = WA.room.website.create({
    name,
    url: url.toString(),
    position: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
    visible,
    origin: "map",
  });
  museumBoardWebsites.push(website);
}

function setMuseumBoardsVisible(visible) {
  for (const website of museumBoardWebsites) {
    website.visible = visible;
  }
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
    const boardConfigs = getMuseumBoardConfigs(map.layers);
    const showroomArea = findAreaObject(map.layers, MUSEUM_SHOWROOM_AREA_NAME);
    const playerPosition = await WA.player.getPosition();
    const visible = showroomArea ? isInsideRect(playerPosition, showroomArea) : false;

    await Promise.all(
      boardConfigs.map((config) => renderMuseumBoard(config.boardName, config.rect, visible))
    );
    WA.room.area.onEnter(MUSEUM_SHOWROOM_AREA_NAME).subscribe(() => setMuseumBoardsVisible(true));
    WA.room.area.onLeave(MUSEUM_SHOWROOM_AREA_NAME).subscribe(() => setMuseumBoardsVisible(false));
    console.info(`Museum showroom boards ready: ${boardConfigs.length}`);
  })
  .catch((error) => console.error("Museum showroom board initialization failed", error));
