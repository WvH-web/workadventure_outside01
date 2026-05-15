/// <reference types="@workadventure/iframe-api-typings" />

const TILE_SIZE = 32;
const TILE_CENTER = TILE_SIZE / 2;
const START_AREA_NAME = "water_slide_start";
const SLIDE_SPEED = 340;
const SLIDE_STEP_PAUSE_MS = 15;
const CHEER_EVERY_STEPS = 18;
const CHEER_HIDE_DELAY_MS = 900;
const CHEER_VARIABLE = "waterSlideCheer";
const CHEER_MESSAGES = [
    "Juhuuu! \\o/",
    "Woooosh! :D",
    "Huiiii! ^_^",
    "Festhalten! (>_<)",
    "Wasserrutschen-Modus! B-)",
    "Yeeeeah! \\o/",
];

type Tile = readonly [number, number];
type CheerPayload = {
    message: string;
    playerName: string;
    nonce: string;
};

const routeWaypoints: Tile[] = [
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
let cheerWebsite: Awaited<ReturnType<typeof WA.ui.website.open>> | undefined;

const tileToPixelCenter = ([tileX, tileY]: Tile) => ({
    x: tileX * TILE_SIZE + TILE_CENTER,
    y: tileY * TILE_SIZE + TILE_CENTER,
});

const step = (from: number, to: number) => {
    if (from === to) return 0;
    return from < to ? 1 : -1;
};

const expandRoute = (waypoints: Tile[]) => {
    const route: Tile[] = [];

    waypoints.slice(0, -1).forEach(([startX, startY], index) => {
        const [endX, endY] = waypoints[index + 1];
        const stepX = step(startX, endX);
        const stepY = step(startY, endY);
        let currentX = startX;
        let currentY = startY;

        if (index === 0) {
            route.push([currentX, currentY]);
        }

        while (currentX !== endX || currentY !== endY) {
            currentX += stepX;
            currentY += stepY;
            route.push([currentX, currentY]);
        }
    });

    return route;
};

const wait = (milliseconds: number) =>
    new Promise(resolve => window.setTimeout(resolve, milliseconds));

const randomCheerMessage = () =>
    CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];

const cheerPageUrl = new URL("../water-slide-cheer.html", import.meta.url).toString();

const cheerUrl = (message: string, playerName = "") =>
    `${cheerPageUrl}?text=${encodeURIComponent(message)}&name=${encodeURIComponent(playerName)}`;

const showCheer = async (message = randomCheerMessage(), playerName = "") => {
    const url = cheerUrl(message, playerName);

    if (cheerWebsite) {
        cheerWebsite.url = url;
        cheerWebsite.visible = true;
        return;
    }

    cheerWebsite = await WA.ui.website.open({
        url,
        visible: true,
        position: {
            vertical: "top",
            horizontal: "middle",
        },
        size: {
            width: "280px",
            height: "88px",
        },
        margin: {
            top: "88px",
        },
    });
};

const hideCheer = async () => {
    if (!cheerWebsite) return;
    cheerWebsite.visible = false;
};

const isCheerPayload = (value: unknown): value is CheerPayload =>
    Boolean(
        value &&
        typeof value === "object" &&
        "message" in value &&
        typeof value.message === "string"
    );

const publishCheer = async (message: string) => {
    const payload: CheerPayload = {
        message,
        playerName: WA.player.name,
        nonce: `${Date.now()}-${Math.random()}`,
    };

    await WA.player.state.saveVariable(CHEER_VARIABLE, payload, {
        public: true,
        persist: false,
        ttl: 5,
        scope: "room",
    });
};

const cheer = async () => {
    const message = randomCheerMessage();
    await showCheer(message);
    await publishCheer(message).catch(error => console.error("Water slide cheer publish failed", error));
};

const routeTiles = expandRoute(routeWaypoints);

WA.onInit().then(() => {
    const start = tileToPixelCenter(routeTiles[0]);

    WA.room.area.create({
        name: START_AREA_NAME,
        x: start.x - TILE_CENTER,
        y: start.y - TILE_CENTER,
        width: TILE_SIZE,
        height: TILE_SIZE,
    });

    WA.players.configureTracking({
        players: true,
        movement: false,
    }).then(() => {
        WA.players.onVariableChange(CHEER_VARIABLE).subscribe(({ player, value }) => {
            if (!isCheerPayload(value)) return;
            void showCheer(value.message, value.playerName || player.name);
        });
    }).catch(error => console.error("Water slide cheer tracking failed", error));

    WA.room.area.onEnter(START_AREA_NAME).subscribe(async () => {
        if (isSliding) return;
        isSliding = true;

        WA.controls.disablePlayerControls();
        await cheer();

        try {
            // Start with the second waypoint because entering the first tile starts the slide.
            const slideWaypoints = routeTiles.slice(1).map(tileToPixelCenter);
            for (const [index, waypoint] of slideWaypoints.entries()) {
                const result = await WA.player.moveTo(waypoint.x, waypoint.y, SLIDE_SPEED);
                if (result.cancelled) break;
                if ((index + 1) % CHEER_EVERY_STEPS === 0 && index < slideWaypoints.length - 1) {
                    await cheer();
                }
                await wait(SLIDE_STEP_PAUSE_MS);
            }
        } catch (error) {
            console.error("Water slide failed", error);
        } finally {
            await wait(CHEER_HIDE_DELAY_MS);
            await hideCheer();
            WA.controls.restorePlayerControls();
            await wait(750);
            isSliding = false;
        }
    });
}).catch(error => console.error("Water slide init failed", error));

export {};
