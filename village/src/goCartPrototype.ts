/// <reference types="@workadventure/iframe-api-typings" />

import type { ActionMessage } from "@workadventure/iframe-api-typings";
import type { ButtonActionBarClickedCallback } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Ui/ButtonActionBar";

const TILE_SIZE = 32;
const TILE_CENTER = TILE_SIZE / 2;
const CART_AREA_NAME = "go_cart_prototype_area";
const PARKED_CART_LAYER = "goCartParked";
const CART_PARKING_TILES = [
    [185, 43],
    [188, 43],
    [191, 43],
    [194, 43],
    [197, 43],
] as const;
const CART_WIDTH = 68;
const CART_HEIGHT = 56;
const CART_INTERACTION_RADIUS = TILE_SIZE * 2;
const CART_Y_OFFSET = 6;
const TEMPORARY_WOKA_TEXTURE_ID = "wvh-go-cart-avatar-v3";
const TEMPORARY_WOKA_URL = "https://together.deine-schule.com/resources/wvh/go-cart-avatar.png?v=3";
const TEMPORARY_WOKA_FRAME_WIDTH = 96;
const TEMPORARY_WOKA_FRAME_HEIGHT = 80;
const TEMPORARY_WOKA_SCALE = 0.62;
const EXIT_CART_BUTTON_ID = "wvh-exit-go-cart";
const BOOST_DISTANCE = 220;
const BOOST_SPEED = 1050;
const BOOST_COOLDOWN_MS = 80;

type Direction = "left" | "right" | "up" | "down";
type WvhPlayerApi = typeof WA.player & {
    setTemporaryWoka?: (options: {
        textureId: string;
        url: string;
        frameWidth: number;
        frameHeight: number;
        scale: number;
    }) => Promise<void>;
    restoreWoka?: () => Promise<void>;
};

let driverCart: ReturnType<typeof WA.room.website.create> | undefined;
let actionMessage: ActionMessage | undefined;
let cartMode = false;
let nativeCartAvatarActive = false;
let boostRunning = false;
let lastBoostAt = 0;
let cartFollowTimer: number | undefined;
let cartFollowInFlight = false;
let exitInProgress = false;
let exitHintWebsite: Awaited<ReturnType<typeof WA.ui.website.open>> | undefined;
let exitActionMessage: ActionMessage | undefined;

const driverCartUrl = new URL("../go-cart-driver.html", import.meta.url).toString();
const exitHintUrl = new URL("../go-cart-exit-hint.html", import.meta.url).toString();

const tileToPixelCenter = ([tileX, tileY]: readonly [number, number]) => ({
    x: tileX * TILE_SIZE + TILE_CENTER,
    y: tileY * TILE_SIZE + TILE_CENTER,
});

const directionVector = (direction: Direction) => {
    switch (direction) {
        case "left":
            return { x: -1, y: 0 };
        case "right":
            return { x: 1, y: 0 };
        case "up":
            return { x: 0, y: -1 };
        case "down":
            return { x: 0, y: 1 };
    }
};

const moveWebsiteToPlayer = async () => {
    if (!driverCart) return;
    const position = await WA.player.getPosition();
    driverCart.x = position.x - CART_WIDTH / 2;
    driverCart.y = position.y - CART_HEIGHT + CART_Y_OFFSET;
};

const moveDriverCartTo = (x: number, y: number) => {
    if (nativeCartAvatarActive || !driverCart) return;
    driverCart.x = x - CART_WIDTH / 2;
    driverCart.y = y - CART_HEIGHT + CART_Y_OFFSET;
};

const startCartFollow = () => {
    if (nativeCartAvatarActive) return;
    if (cartFollowTimer !== undefined) return;

    cartFollowTimer = window.setInterval(() => {
        if (!cartMode || !driverCart || cartFollowInFlight) return;

        cartFollowInFlight = true;
        moveWebsiteToPlayer()
            .catch(error => console.error("Go-Cart follow failed", error))
            .finally(() => {
                cartFollowInFlight = false;
            });
    }, 45);
};

const stopCartFollow = () => {
    if (cartFollowTimer === undefined) return;
    window.clearInterval(cartFollowTimer);
    cartFollowTimer = undefined;
    cartFollowInFlight = false;
};

const showParkedCarts = () => {
    WA.room.showLayer(PARKED_CART_LAYER);
};

const exitButtonCallback: ButtonActionBarClickedCallback = () => {
    requestExitCart();
};

const requestExitCart = () => {
    void exitCart().catch(error => console.error("Go-Cart exit failed", error));
};

const safeRemoveActionBarButton = (id: string) => {
    try {
        WA.ui.actionBar.removeButton(id);
    } catch (error) {
        console.warn(`Go-Cart button cleanup failed: ${id}`, error);
    }
};

const safeAddExitButton = () => {
    try {
        WA.ui.actionBar.addButton({
            id: EXIT_CART_BUTTON_ID,
            label: "Aussteigen",
            callback: exitButtonCallback,
        });
    } catch (error) {
        console.warn("Go-Cart exit button setup failed", error);
    }
};

const waitWithTimeout = async (promise: Promise<unknown> | undefined, timeoutMs: number, label: string) => {
    if (!promise) return;

    let timeoutHandle: number | undefined;
    const timeout = new Promise<void>(resolve => {
        timeoutHandle = window.setTimeout(() => {
            console.warn(`${label} timed out`);
            resolve();
        }, timeoutMs);
    });

    await Promise.race([promise.catch(error => console.error(label, error)), timeout]);

    if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
    }
};

const showExitControls = async () => {
    safeRemoveActionBarButton(EXIT_CART_BUTTON_ID);
    safeAddExitButton();

    exitActionMessage?.remove();
    exitActionMessage = WA.ui.displayActionMessage({
        message: "Go-Cart verlassen: Leertaste oder Esc.",
        callback: requestExitCart,
    });

    if (!exitHintWebsite) {
        exitHintWebsite = await WA.ui.website.open({
            url: exitHintUrl,
            visible: true,
            position: {
                vertical: "bottom",
                horizontal: "middle",
            },
            size: {
                width: "260px",
                height: "64px",
            },
            margin: {
                bottom: "112px",
            },
        });
        return;
    }

    exitHintWebsite.visible = true;
};

const hideExitControls = () => {
    safeRemoveActionBarButton(EXIT_CART_BUTTON_ID);
    exitActionMessage?.remove();
    exitActionMessage = undefined;

    if (!exitHintWebsite) return;
    exitHintWebsite.visible = false;
};

const enterCart = async () => {
    if (cartMode) return;
    cartMode = true;
    WA.room.hideLayer(PARKED_CART_LAYER);

    const position = await WA.player.getPosition();
    const wvhPlayer = WA.player as WvhPlayerApi;

    if (typeof wvhPlayer.setTemporaryWoka === "function") {
        try {
            await wvhPlayer.setTemporaryWoka({
                textureId: TEMPORARY_WOKA_TEXTURE_ID,
                url: TEMPORARY_WOKA_URL,
                frameWidth: TEMPORARY_WOKA_FRAME_WIDTH,
                frameHeight: TEMPORARY_WOKA_FRAME_HEIGHT,
                scale: TEMPORARY_WOKA_SCALE,
            });
            nativeCartAvatarActive = true;
        } catch (error) {
            nativeCartAvatarActive = false;
            console.warn("Native Go-Cart avatar unavailable, using overlay fallback", error);
        }
    }

    if (!nativeCartAvatarActive) {
        driverCart = WA.room.website.create({
            name: "go-cart-driver-prototype",
            url: driverCartUrl,
            position: {
                x: position.x - CART_WIDTH / 2,
                y: position.y - CART_HEIGHT + CART_Y_OFFSET,
                width: CART_WIDTH,
                height: CART_HEIGHT,
            },
            visible: true,
            origin: "map",
        });
        startCartFollow();
    }

    actionMessage?.remove();
    actionMessage = undefined;
    await showExitControls();
};

const exitCart = async () => {
    if (!cartMode || exitInProgress) return;
    exitInProgress = true;

    try {
        cartMode = false;
        boostRunning = false;
        stopCartFollow();
        actionMessage?.remove();
        actionMessage = undefined;
        hideExitControls();

        if (nativeCartAvatarActive) {
            const wvhPlayer = WA.player as WvhPlayerApi;
            await waitWithTimeout(wvhPlayer.restoreWoka?.(), 1000, "Go-Cart avatar restore failed");
            nativeCartAvatarActive = false;
        }

        if (driverCart) {
            await waitWithTimeout(WA.room.website.delete(driverCart.name), 1000, "Go-Cart overlay cleanup failed");
            driverCart = undefined;
        }

        showParkedCarts();
    } finally {
        exitInProgress = false;
    }
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (!cartMode) return;

    if (event.key === "Escape" || event.code === "Space" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        requestExitCart();
    }
};

const boost = async (direction: Direction, x: number, y: number) => {
    const now = Date.now();
    if (!cartMode || boostRunning || now - lastBoostAt < BOOST_COOLDOWN_MS) return;

    boostRunning = true;
    lastBoostAt = now;

    const vector = directionVector(direction);
    const targetX = x + vector.x * BOOST_DISTANCE;
    const targetY = y + vector.y * BOOST_DISTANCE;

    try {
        await WA.player.moveTo(targetX, targetY, BOOST_SPEED);
        await moveWebsiteToPlayer();
    } catch (error) {
        console.error("Go-Cart boost failed", error);
    } finally {
        boostRunning = false;
    }
};

WA.onInit().then(() => {
    showParkedCarts();
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    CART_PARKING_TILES.forEach((tile, index) => {
        const spot = tileToPixelCenter(tile);
        const areaName = `${CART_AREA_NAME}_${index + 1}`;

        WA.room.area.create({
            name: areaName,
            x: spot.x - CART_INTERACTION_RADIUS,
            y: spot.y - CART_INTERACTION_RADIUS,
            width: CART_INTERACTION_RADIUS * 2,
            height: CART_INTERACTION_RADIUS * 2,
        });

        WA.room.area.onEnter(areaName).subscribe(() => {
            if (cartMode) return;
            actionMessage = WA.ui.displayActionMessage({
                message: "Go-Cart testen: Leertaste zum Einsteigen.",
                callback: () => {
                    void enterCart();
                },
            });
        });

        WA.room.area.onLeave(areaName).subscribe(() => {
            if (cartMode) return;
            actionMessage?.remove();
            actionMessage = undefined;
        });
    });

    WA.player.onPlayerMove(event => {
        if (!cartMode) return;

        moveDriverCartTo(event.x, event.y);

        if (event.moving) {
            void boost(event.direction, event.x, event.y);
        }
    });
}).catch(error => console.error("Go-Cart prototype init failed", error));

export {};
