/// <reference types="@workadventure/iframe-api-typings" />

import type { ActionMessage } from "@workadventure/iframe-api-typings";

const TILE_SIZE = 32;
const TILE_CENTER = TILE_SIZE / 2;
const CART_AREA_NAME = "go_cart_prototype_area";
const CART_TILE_LAYER = "AboveWorld3";
const CART_START_TILE = [160, 57] as const;
const CART_WIDTH = 68;
const CART_HEIGHT = 56;
const CART_INTERACTION_RADIUS = TILE_SIZE * 2;
const CART_SPEED = 1050;
const BOOST_DISTANCE = 220;
const BOOST_COOLDOWN_MS = 80;
const CART_Y_OFFSET = 6;
const TEMPORARY_WOKA_TEXTURE_ID = "wvh-go-cart-avatar-v3";
const TEMPORARY_WOKA_URL = "https://together.deine-schule.com/resources/wvh/go-cart-avatar.png?v=3";
const TEMPORARY_WOKA_FRAME_WIDTH = 96;
const TEMPORARY_WOKA_FRAME_HEIGHT = 80;
const TEMPORARY_WOKA_SCALE = 0.62;
const PARKED_CART_TILESET_FILE = "go-cart-parked.tileset.json";

type Direction = "left" | "right" | "up" | "down";
type TileValue = number | string | null;
type TilePoint = { x: number; y: number };
type TiledLayer = {
    name: string;
    type: string;
    data?: number[];
    width?: number;
    layers?: TiledLayer[];
};
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
let cartArea: ReturnType<typeof WA.room.area.create> | undefined;
let actionMessage: ActionMessage | undefined;
let cartMode = false;
let nativeCartAvatarActive = false;
let boostRunning = false;
let lastBoostAt = 0;
let cartFollowTimer: number | undefined;
let cartFollowInFlight = false;
let parkedCartTileId: number | undefined;
let parkedCartTile: TilePoint | undefined;
let parkingLayerData: number[] | undefined;
let parkingLayerWidth = 0;

const driverCartUrl = new URL("../go-cart-driver.html", import.meta.url).toString();

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

const findLayer = (layers: TiledLayer[], name: string): TiledLayer | undefined => {
    for (const layer of layers) {
        if (layer.name === name) return layer;
        if (layer.layers) {
            const nestedLayer = findLayer(layer.layers, name);
            if (nestedLayer) return nestedLayer;
        }
    }
    return undefined;
};

const loadParkedCartTile = async () => {
    const parkedCartTilesetUrl = new URL(PARKED_CART_TILESET_FILE, WA.room.mapURL).toString();
    const [tileId, tiledMap] = await Promise.all([
        WA.room.loadTileset(parkedCartTilesetUrl),
        WA.room.getTiledMap() as Promise<{ layers: TiledLayer[] }>,
    ]);
    const parkingLayer = findLayer(tiledMap.layers, CART_TILE_LAYER);

    parkedCartTileId = tileId;
    parkingLayerData = parkingLayer?.data;
    parkingLayerWidth = parkingLayer?.width ?? 0;
};

const pixelToParkingTile = (x: number, y: number): TilePoint => ({
    // The parked sprite is three tiles wide. Anchor the tile on its left cell,
    // so the visible cart stays centered where the player exits.
    x: Math.max(0, Math.round(x / TILE_SIZE) - 1),
    y: Math.max(0, Math.round(y / TILE_SIZE)),
});

const parkingTileToAreaCenter = (tile: TilePoint) => ({
    x: (tile.x + 1.5) * TILE_SIZE,
    y: (tile.y + 0.5) * TILE_SIZE,
});

const getOriginalParkingTile = (tile: TilePoint): TileValue => {
    if (!parkingLayerData || parkingLayerWidth <= 0) return null;

    const originalTile = parkingLayerData[tile.y * parkingLayerWidth + tile.x] ?? 0;
    return originalTile === 0 ? null : originalTile;
};

const clearParkedCartTile = () => {
    if (!parkedCartTile) return;

    WA.room.setTiles([{
        x: parkedCartTile.x,
        y: parkedCartTile.y,
        tile: getOriginalParkingTile(parkedCartTile),
        layer: CART_TILE_LAYER,
    }]);
};

const parkCartAt = (x: number, y: number) => {
    if (parkedCartTileId === undefined) return;

    const nextTile = pixelToParkingTile(x, y);
    if (!parkedCartTile || parkedCartTile.x !== nextTile.x || parkedCartTile.y !== nextTile.y) {
        clearParkedCartTile();
        parkedCartTile = nextTile;
    }

    WA.room.setTiles([{
        x: parkedCartTile.x,
        y: parkedCartTile.y,
        tile: parkedCartTileId,
        layer: CART_TILE_LAYER,
    }]);

    if (cartArea) {
        const areaCenter = parkingTileToAreaCenter(parkedCartTile);
        cartArea.x = areaCenter.x - CART_INTERACTION_RADIUS;
        cartArea.y = areaCenter.y - CART_INTERACTION_RADIUS;
    }
};

const enterCart = async () => {
    if (cartMode) return;
    cartMode = true;
    clearParkedCartTile();

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
    const start = tileToPixelCenter(CART_START_TILE);

    return loadParkedCartTile().then(() => start);
}).then(start => {
    parkCartAt(start.x, start.y);

    cartArea = WA.room.area.create({
        name: CART_AREA_NAME,
        x: start.x - CART_INTERACTION_RADIUS,
        y: start.y - CART_INTERACTION_RADIUS,
        width: CART_INTERACTION_RADIUS * 2,
        height: CART_INTERACTION_RADIUS * 2,
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

        moveDriverCartTo(event.x, event.y);

        if (event.moving) {
            void boost(event.direction, event.x, event.y);
        }
    });
}).catch(error => console.error("Go-Cart prototype init failed", error));

export {};
