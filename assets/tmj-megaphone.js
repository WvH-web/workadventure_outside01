import "./main-b0d5a69f.js";

const MEGAPHONE_LAYER_NAME = "megaphoneZones";
const SYNCED_SPACE_PROPERTIES = [
  "cameraState",
  "microphoneState",
  "screenSharingState",
  "megaphoneState",
];

const activeZones = new Map();

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

async function enterMegaphoneZone(areaName, role, spaceName) {
  if (activeZones.has(areaName)) {
    return;
  }

  if (!WA.spaces?.joinSpace) {
    console.error("WorkAdventure Spaces API is not available; TMJ megaphone zone skipped.");
    return;
  }

  const space = await WA.spaces.joinSpace(
    `tmj-megaphone-${spaceName}`,
    "streaming",
    SYNCED_SPACE_PROPERTIES
  );

  let actionMessage;
  if (role === "speaker") {
    space.startStreaming();
    actionMessage = WA.ui.displayActionMessage({
      message: "Mikro aktiv: Das Publikum in diesem Theater kann dich hoeren. Verlasse die Buehne zum Stoppen.",
      callback: () => {},
    });
  }

  activeZones.set(areaName, { role, space, actionMessage });
}

function leaveMegaphoneZone(areaName) {
  const activeZone = activeZones.get(areaName);
  if (!activeZone) {
    return;
  }

  activeZone.actionMessage?.remove();
  if (activeZone.role === "speaker") {
    activeZone.space.stopStreaming();
  }
  activeZone.space.leave();
  activeZones.delete(areaName);
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
