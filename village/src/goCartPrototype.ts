/// <reference types="@workadventure/iframe-api-typings" />

import type { ActionMessage } from "@workadventure/iframe-api-typings";
import type { ButtonActionBarClickedCallback } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Ui/ButtonActionBar";
import type { PlayerPosition } from "@workadventure/iframe-api-typings/play/src/front/Api/Events/PlayerPosition";
import type { RemotePlayerInterface } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Players/RemotePlayer";

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
const GEAR_BOOST_DISTANCES = [120, 220, 360] as const;
const BOOST_COOLDOWN_MS = 80;
const CART_Y_OFFSET = 6;
const EXIT_CART_BUTTON_ID = "wvh-exit-go-cart";
const GEAR_BUTTON_IDS = ["wvh-go-cart-gear-1", "wvh-go-cart-gear-2", "wvh-go-cart-gear-3"] as const;
const GEAR_SPEEDS = [420, 860, 1500] as const;
const DEFAULT_GEAR = 2;
const CART_STATE_VARIABLE = "wvhGoCartState";

type Direction = "left" | "right" | "up" | "down";
type CartWebsite = ReturnType<typeof WA.room.website.create>;
type CartState = {
    inCart: boolean;
    gear: number;
    nonce: string;
};

let driverCart: CartWebsite | undefined;
let actionMessage: ActionMessage | undefined;
let cartMode = false;
let boostRunning = false;
let lastBoostAt = 0;
let cartFollowTimer: number | undefined;
let cartFollowInFlight = false;
let exitHintWebsite: Awaited<ReturnType<typeof WA.ui.website.open>> | undefined;
let currentGear = DEFAULT_GEAR;
const remoteDriverCarts = new Map<number, CartWebsite>();

const driverCartUrl = new URL("../go-cart-driver.html", import.meta.url).toString();
const exitHintUrl = new URL("../go-cart-exit-hint.html", import.meta.url).toString();
const exitHintUrlForGear = () => `${exitHintUrl}?gear=${currentGear}`;

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

const isCartState = (value: unknown): value is CartState =>
    Boolean(
        value &&
        typeof value === "object" &&
        "inCart" in value &&
        typeof value.inCart === "boolean"
    );

const moveCartWebsiteTo = (cart: CartWebsite, x: number, y: number) => {
    cart.x = x - CART_WIDTH / 2;
    cart.y = y - CART_HEIGHT + CART_Y_OFFSET;
};

const moveWebsiteToPlayer = async () => {
    if (!driverCart) return;
    const position = await WA.player.getPosition();
    moveCartWebsiteTo(driverCart, position.x, position.y);
};

const moveDriverCartTo = (x: number, y: number) => {
    if (!driverCart) return;
    moveCartWebsiteTo(driverCart, x, y);
};

const startCartFollow = () => {
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

const refreshGearHint = () => {
    if (!exitHintWebsite) return;
    exitHintWebsite.url = exitHintUrlForGear();
};

const publishCartState = async (inCart: boolean) => {
    const state: CartState = {
        inCart,
        gear: currentGear,
        nonce: `${Date.now()}-${Math.random()}`,
    };

    await WA.player.state.saveVariable(CART_STATE_VARIABLE, state, {
        public: true,
        persist: false,
        scope: "room",
    });
};

const setGear = (gear: number) => {
    if (!cartMode || !Number.isInteger(gear) || gear < 1 || gear > GEAR_SPEEDS.length) return;
    currentGear = gear;
    refreshGearHint();
    publishCartState(true).catch(error => console.error("Go-Cart gear state publish failed", error));
};

const exitButtonCallback: ButtonActionBarClickedCallback = () => {
    void exitCart();
};

const gearButtonCallbacks = GEAR_BUTTON_IDS.map((_, index): ButtonActionBarClickedCallback => {
    const gear = index + 1;
    return () => setGear(gear);
});

const showExitControls = async () => {
    WA.ui.actionBar.addButton({
        id: EXIT_CART_BUTTON_ID,
        label: "Aussteigen",
        callback: exitButtonCallback,
    });

    GEAR_BUTTON_IDS.forEach((id, index) => {
        const gear = index + 1;
        WA.ui.actionBar.addButton({
            id,
            label: `Gang ${gear}`,
            callback: gearButtonCallbacks[index],
        });
    });

    if (!exitHintWebsite) {
        exitHintWebsite = await WA.ui.website.open({
            url: exitHintUrlForGear(),
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
    refreshGearHint();
};

const hideExitControls = async () => {
    WA.ui.actionBar.removeButton(EXIT_CART_BUTTON_ID);
    GEAR_BUTTON_IDS.forEach(id => WA.ui.actionBar.removeButton(id));

    if (!exitHintWebsite) return;
    exitHintWebsite.visible = false;
};

const createCartWebsite = (name: string, x: number, y: number) =>
    WA.room.website.create({
        name,
        url: driverCartUrl,
        position: {
            x: x - CART_WIDTH / 2,
            y: y - CART_HEIGHT + CART_Y_OFFSET,
            width: CART_WIDTH,
            height: CART_HEIGHT,
        },
        visible: true,
        origin: "map",
    });

const removeRemoteCart = (playerId: number) => {
    const remoteCart = remoteDriverCarts.get(playerId);
    if (!remoteCart) return;

    remoteDriverCarts.delete(playerId);
    WA.room.website.delete(remoteCart.name).catch(() => undefined);
};

const renderRemoteCart = (player: RemotePlayerInterface) => {
    const state = player.state[CART_STATE_VARIABLE];
    if (!isCartState(state) || !state.inCart) {
        removeRemoteCart(player.playerId);
        return;
    }

    const cartName = `go-cart-driver-remote-${player.playerId}`;
    let remoteCart = remoteDriverCarts.get(player.playerId);

    if (!remoteCart) {
        remoteCart = createCartWebsite(cartName, player.position.x, player.position.y);
        remoteDriverCarts.set(player.playerId, remoteCart);
        return;
    }

    remoteCart.visible = true;
    moveCartWebsiteTo(remoteCart, player.position.x, player.position.y);
};

const moveRemoteCart = (playerId: number, position: PlayerPosition) => {
    const remoteCart = remoteDriverCarts.get(playerId);
    if (!remoteCart) return;
    moveCartWebsiteTo(remoteCart, position.x, position.y);
};

const startRemoteCartTracking = async () => {
    await WA.players.configureTracking({
        players: true,
        movement: true,
    });

    for (const player of WA.players.list()) {
        renderRemoteCart(player);
    }

    WA.players.onPlayerEnters.subscribe(player => {
        renderRemoteCart(player);
    });

    WA.players.onPlayerLeaves.subscribe(player => {
        removeRemoteCart(player.playerId);
    });

    WA.players.onPlayerMoves.subscribe(({ player, newPosition }) => {
        moveRemoteCart(player.playerId, newPosition);
    });

    WA.players.onVariableChange(CART_STATE_VARIABLE).subscribe(({ player }) => {
        renderRemoteCart(player);
    });
};

const enterCart = async () => {
    if (cartMode) return;
    cartMode = true;
    currentGear = DEFAULT_GEAR;
    WA.room.hideLayer(PARKED_CART_LAYER);

    const position = await WA.player.getPosition();
    driverCart = createCartWebsite("go-cart-driver-prototype", position.x, position.y);
    startCartFollow();
    await publishCartState(true);

    actionMessage?.remove();
    actionMessage = undefined;
    await showExitControls();
};

const exitCart = async () => {
    if (!cartMode) return;
    cartMode = false;
    boostRunning = false;
    stopCartFollow();
    actionMessage?.remove();
    actionMessage = undefined;
    await hideExitControls();
    await publishCartState(false).catch(error => console.error("Go-Cart state clear failed", error));

    if (driverCart) {
        await WA.room.website.delete(driverCart.name).catch(() => undefined);
        driverCart = undefined;
    }

    showParkedCarts();
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (!cartMode) return;

    if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        void exitCart();
    }
};

const boost = async (direction: Direction, x: number, y: number) => {
    const now = Date.now();
    if (!cartMode || boostRunning || now - lastBoostAt < BOOST_COOLDOWN_MS) return;

    boostRunning = true;
    lastBoostAt = now;

    const vector = directionVector(direction);
    const boostDistance = GEAR_BOOST_DISTANCES[currentGear - 1];
    const targetX = x + vector.x * boostDistance;
    const targetY = y + vector.y * boostDistance;
    const cartSpeed = GEAR_SPEEDS[currentGear - 1];

    try {
        await WA.player.moveTo(targetX, targetY, cartSpeed);
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
    startRemoteCartTracking().catch(error => console.error("Go-Cart remote tracking failed", error));

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
