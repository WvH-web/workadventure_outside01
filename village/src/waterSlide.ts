/// <reference types="@workadventure/iframe-api-typings" />

const TILE_SIZE = 32;
const TILE_CENTER = TILE_SIZE / 2;
const START_AREA_NAME = "water_slide_start";
const SLIDE_SPEED = 900;

const routeTiles = [
    [156, 54],
    [156, 85],
    [155, 85],
    [155, 86],
    [154, 86],
    [154, 87],
    [150, 87],
    [150, 84],
    [156, 84],
    [156, 66],
    [154, 66],
    [153, 66],
    [153, 57],
];

let isSliding = false;

const tileToPixelCenter = ([tileX, tileY]: number[]) => ({
    x: tileX * TILE_SIZE + TILE_CENTER,
    y: tileY * TILE_SIZE + TILE_CENTER,
});

const wait = (milliseconds: number) =>
    new Promise(resolve => window.setTimeout(resolve, milliseconds));

WA.onInit().then(() => {
    const start = tileToPixelCenter(routeTiles[0]);

    WA.room.area.create({
        name: START_AREA_NAME,
        x: start.x - TILE_CENTER,
        y: start.y - TILE_CENTER,
        width: TILE_SIZE,
        height: TILE_SIZE,
    });

    WA.room.area.onEnter(START_AREA_NAME).subscribe(async () => {
        if (isSliding) return;
        isSliding = true;

        WA.controls.disablePlayerControls();

        try {
            // Start with the second waypoint because entering the first tile starts the slide.
            for (const waypoint of routeTiles.slice(1).map(tileToPixelCenter)) {
                const result = await WA.player.moveTo(waypoint.x, waypoint.y, SLIDE_SPEED);
                if (result.cancelled) break;
                await wait(40);
            }
        } catch (error) {
            console.error("Water slide failed", error);
        } finally {
            WA.controls.restorePlayerControls();
            await wait(750);
            isSliding = false;
        }
    });
}).catch(error => console.error("Water slide init failed", error));

export {};
