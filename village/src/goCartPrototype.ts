/// <reference types="@workadventure/iframe-api-typings" />

import type { ActionMessage } from "@workadventure/iframe-api-typings";

const TILE_SIZE = 32;
const TILE_CENTER = TILE_SIZE / 2;
const CART_AREA_NAME = "go_cart_prototype_area";
const CART_START_TILE = [160, 57] as const;
const CART_WIDTH = 76;
const CART_HEIGHT = 58;
const CART_SPEED = 260;
const BOOST_DISTANCE = 92;
const BOOST_COOLDOWN_MS = 180;
const PUFF_COOLDOWN_MS = 320;
const PUFF_LIFETIME_MS = 850;

type Direction = "left" | "right" | "up" | "down";

let parkedCart: ReturnType<typeof WA.room.website.create> | undefined;
let driverCart: ReturnType<typeof WA.room.website.create> | undefined;
let cartArea: ReturnType<typeof WA.room.area.create> | undefined;
let actionMessage: ActionMessage | undefined;
let cartMode = false;
let boostRunning = false;
let lastBoostAt = 0;
let lastPuffAt = 0;
let puffCount = 0;

const cartUrl = new URL("../go-cart-prototype.html", import.meta.url).toString();
const puffUrl = new URL("../go-cart-puff.html", import.meta.url).toString();

const wait = (milliseconds: number) =>
    new Promise(resolve => window.setTimeout(resolve, milliseconds));

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
    driverCart.y = position.y - CART_HEIGHT / 2 + 12;
};

const createPuff = async (x: number, y: number) => {
    const now = Date.now();
    if (now - lastPuffAt < PUFF_COOLDOWN_MS) return;
    lastPuffAt = now;

    const puffName = `go-cart-puff-${Date.now()}-${puffCount++}`;
    WA.room.website.create({
        name: puffName,
        url: puffUrl,
        position: {
            x: x - 22,
            y: y - 18,
            width: 44,
            height: 36,
        },
        visible: true,
    });

    await wait(PUFF_LIFETIME_MS);
    await WA.room.website.delete(puffName).catch(() => undefined);
};

const parkCartAt = (x: number, y: number) => {
    if (!parkedCart) {
        parkedCart = WA.room.website.create({
            name: "go-cart-parked-prototype",
            url: cartUrl,
            position: {
                x: x - CART_WIDTH / 2,
                y: y - CART_HEIGHT / 2 + 12,
                width: CART_WIDTH,
                height: CART_HEIGHT,
            },
            visible: true,
        });
    } else {
        parkedCart.x = x - CART_WIDTH / 2;
        parkedCart.y = y - CART_HEIGHT / 2 + 12;
        parkedCart.visible = true;
    }

    if (cartArea) {
        cartArea.x = x - TILE_SIZE;
        cartArea.y = y - TILE_SIZE;
    }
};

const enterCart = async () => {
    if (cartMode) return;
    cartMode = true;
    parkedCart && (parkedCart.visible = false);

    const position = await WA.player.getPosition();
    driverCart = WA.room.website.create({
        name: "go-cart-driver-prototype",
        url: cartUrl,
        position: {
            x: position.x - CART_WIDTH / 2,
            y: position.y - CART_HEIGHT / 2 + 12,
            width: CART_WIDTH,
            height: CART_HEIGHT,
        },
        visible: true,
    });

    WA.ui.displayBubble();
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
    WA.ui.removeBubble();
    actionMessage?.remove();
    actionMessage = undefined;

    if (driverCart) {
        await WA.room.website.delete(driverCart.name).catch(() => undefined);
        driverCart = undefined;
    }

    const position = await WA.player.getPosition();
    parkCartAt(position.x, position.y);
};

const boost = async (direction: Direction, x: number, y: number) => {
    const now = Date.now();
    if (!cartMode || boostRunning || now - lastBoostAt < BOOST_COOLDOWN_MS) return;

    boostRunning = true;
    lastBoostAt = now;

    const vector = directionVector(direction);
    const targetX = x + vector.x * BOOST_DISTANCE;
    const targetY = y + vector.y * BOOST_DISTANCE;

    void createPuff(x - vector.x * 26, y - vector.y * 26);

    try {
        const result = await WA.player.moveTo(targetX, targetY, CART_SPEED);
        if (!result.cancelled) {
            await moveWebsiteToPlayer();
        }
    } catch (error) {
        console.error("Go-Cart boost failed", error);
    } finally {
        boostRunning = false;
    }
};

WA.onInit().then(() => {
    const start = tileToPixelCenter(CART_START_TILE);

    parkCartAt(start.x, start.y);

    cartArea = WA.room.area.create({
        name: CART_AREA_NAME,
        x: start.x - TILE_SIZE,
        y: start.y - TILE_SIZE,
        width: TILE_SIZE * 2,
        height: TILE_SIZE * 2,
    });

    WA.room.area.onEnter(CART_AREA_NAME).subscribe(() => {
        if (cartMode) return;
        actionMessage = WA.ui.displayActionMessage({
            message: "Go-Cart Prototyp testen: Leertaste zum Einsteigen.",
            callback: () => {
                void enterCart();
            },
        });
    });

    WA.room.area.onLeave(CART_AREA_NAME).subscribe(() => {
        if (cartMode) return;
        actionMessage?.remove();
        actionMessage = undefined;
    });

    WA.player.onPlayerMove(event => {
        if (!cartMode) return;

        if (driverCart) {
            driverCart.x = event.x - CART_WIDTH / 2;
            driverCart.y = event.y - CART_HEIGHT / 2 + 12;
        }

        if (event.moving) {
            void boost(event.direction, event.x, event.y);
        }
    });
}).catch(error => console.error("Go-Cart prototype init failed", error));

export {};
