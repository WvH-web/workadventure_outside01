const ROOF1_LAYERS = ["roof1", "sign1"];
const ROOF2_LAYERS = ["roof2", "sign2"];
const WINTER_LAYER = "winter2";

const ROOF1_AREAS = [
  { name: "roof_conference_area", x: 195.318272727272, y: 226.025409090909, width: 957.848303030303, height: 1754.00978787879 },
  { name: "roof_coworking_area", x: 5218.0456969697, y: 1728.32833333333, width: 1082.09042424242, height: 1148.67666666667 },
  { name: "roof_office_area", x: 2400, y: 1216, width: 1121.48436363636, height: 1227.32818181818 },
];

const ROOF2_AREAS = [
  { name: "roof_meeting_area", x: 1354.40933333333, y: 1086.38893939394, width: 941.848, height: 1230.01 },
  { name: "roof_show_area", x: 4065.43963636364, y: 1484.995, width: 550.938909090909, height: 1272.43424242424 },
];

let lastRoof1Hidden;
let lastRoof2Hidden;

function isInside(position, area) {
  return (
    position.x >= area.x &&
    position.x <= area.x + area.width &&
    position.y >= area.y &&
    position.y <= area.y + area.height
  );
}

function setLayersVisible(layers, visible) {
  for (const layer of layers) {
    if (visible) {
      WA.room.showLayer(layer);
    } else {
      WA.room.hideLayer(layer);
    }
  }
}

function syncRoofs(position) {
  const roof1Hidden = ROOF1_AREAS.some((area) => isInside(position, area));
  const roof2Hidden = ROOF2_AREAS.some((area) => isInside(position, area));

  if (roof1Hidden !== lastRoof1Hidden) {
    setLayersVisible(ROOF1_LAYERS, !roof1Hidden);
    lastRoof1Hidden = roof1Hidden;
  }

  if (roof2Hidden !== lastRoof2Hidden) {
    setLayersVisible(ROOF2_LAYERS, !roof2Hidden);
    lastRoof2Hidden = roof2Hidden;
  }

  if (roof1Hidden || roof2Hidden) {
    WA.room.hideLayer(WINTER_LAYER);
  } else {
    WA.room.showLayer(WINTER_LAYER);
  }
}

WA.onInit()
  .then(async () => {
    for (const area of [...ROOF1_AREAS, ...ROOF2_AREAS]) {
      WA.room.area.onEnter(area.name).subscribe(async () => {
        syncRoofs(await WA.player.getPosition());
      });
      WA.room.area.onLeave(area.name).subscribe(async () => {
        syncRoofs(await WA.player.getPosition());
      });
    }

    syncRoofs(await WA.player.getPosition());
    WA.player.onPlayerMove((position) => syncRoofs(position));
    console.info("Fast roof visibility sync ready");
  })
  .catch((error) => console.error("Fast roof visibility sync failed", error));
