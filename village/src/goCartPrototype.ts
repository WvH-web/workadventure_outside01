/// <reference types="@workadventure/iframe-api-typings" />

import type { ActionMessage } from "@workadventure/iframe-api-typings";

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
const CART_SPEED = 1050;
const BOOST_DISTANCE = 220;
const BOOST_COOLDOWN_MS = 80;
const CART_Y_OFFSET = 6;
const CART_COLORS = ["red", "blue", "green", "yellow", "violet"] as const;
const CART_ASSET_VERSION = "4";
const TEMPORARY_WOKA_FRAME_WIDTH = 96;
const TEMPORARY_WOKA_FRAME_HEIGHT = 80;
const TEMPORARY_WOKA_SCALE = 0.62;

type Direction = "left" | "right" | "up" | "down";
type CartColor = typeof CART_COLORS[number];
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

const driverCartUrl = new URL("../go-cart-driver.html", import.meta.url).toString();
const cartAvatarUrl = (color: CartColor) =>
    `https://wvh-web.github.io/workadventure_outside01/village/assets/go-cart-avatar-${color}.png?v=${CART_ASSET_VERSION}`;
const cartTextureId = (color: CartColor) => `wvh-go-cart-avatar-${color}-v${CART_ASSET_VERSION}`;
const driverCartUrlFor = (color: CartColor) =>
    `${driverCartUrl}?color=${encodeURIComponent(color)}&v=${CART_ASSET_VERSION}`;

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

const enterCart = async (color: CartColor) => {
    if (cartMode) return;
    cartMode = true;
    WA.room.hideLayer(PARKED_CART_LAYER);

    const position = await WA.player.getPosition();
    const wvhPlayer = WA.player as WvhPlayerApi;

    if (typeof wvhPlayer.setTemporaryWoka === "function") {
        try {
            await wvhPlayer.setTemporaryWoka({
                textureId: cartTextureId(color),
                url: cartAvatarUrl(color),
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
            url: driverCartUrlFor(color),
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
    actionMessage = WA.ui.displayActionMessage({
        message: "Go-Cart aktiv: Laufe in eine Richtung fuer Boost. Leertaste = aussteigen.",
        callback: () => {
            void exitCart();
        },
    });
};

const exitCart = async () => {
    if (!cartMode) return;
    cartMode = false;
    boostRunning = false;
    stopCartFollow();
    actionMessage?.remove();
    actionMessage = undefined;

    if (nativeCartAvatarActive) {
        const wvhPlayer = WA.player as WvhPlayerApi;
        await wvhPlayer.restoreWoka?.().catch(error => console.error("Go-Cart avatar restore failed", error));
        nativeCartAvatarActive = false;
    }

    if (driverCart) {
        await WA.room.website.delete(driverCart.name).catch(() => undefined);
        driverCart = undefined;
    }

    showParkedCarts();
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
        await WA.player.moveTo(targetX, targetY, CART_SPEED);
        await moveWebsiteToPlayer();
    } catch (error) {
        console.error("Go-Cart boost failed", error);
    } finally {
        boostRunning = false;
    }
};

WA.onInit().then(() => {
    showParkedCarts();

    CART_PARKING_TILES.forEach((tile, index) => {
        const spot = tileToPixelCenter(tile);
        const areaName = `${CART_AREA_NAME}_${index + 1}`;
        const color = CART_COLORS[index] ?? "red";

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
                    void enterCart(color);
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
