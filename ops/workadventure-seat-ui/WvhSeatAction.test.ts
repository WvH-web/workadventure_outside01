import { describe, expect, it, vi, afterEach } from "vitest";
import { mount, unmount, tick } from "svelte";
import { castleSeatAction, handleSeatButtonKey } from "../src/front/Components/PopUp/CastleSeatAction";

vi.mock("../src/front/Stores/GameSceneStore", async () => {
    const { writable } = await import("svelte/store");
    return { gameSceneStore: writable(undefined) };
});
import { gameSceneStore } from "../src/front/Stores/GameSceneStore";
import PopUpTriggerActionMessage from "../src/front/Components/PopUp/PopUpTriggerActionMessage.svelte";

const base = "https://wvh-web.github.io/workadventure_outside01/castle/";
// WAM rooms expose the resolved TMJ on the scene, not on the original Room descriptor.
const setRoom = (url?: string) => gameSceneStore.set(url ? ({ mapUrlFile: url, room: { mapUrl: undefined } } as never) : undefined);
afterEach(() => { setRoom(); document.body.innerHTML = ""; });

describe("Castle seat scope", () => {
    it.each(["erdgeschoss", "obergeschoss", "kino", "umgebung", "mittelstufe", "grosse-halle", "bibliothek", "grundschule",
        "oberstufe", "spielesaal", "museum", "musikzimmer", "atelier", "sternwarte", "dorf", "park", "sternwarte-puzzle-preview"])("accepts only registered map %s", id => {
        expect(castleSeatAction(base + id + ".tmj?v=123", "Hinsetzen")).toBe("sit");
        expect(castleSeatAction(base + id + ".tmj", "Aufstehen")).toBe("stand");
    });
    it.each([undefined, "garbage", "https://evil.example/castle/kino.tmj", base + "unknown.tmj", base + "kino.json",
        base + "nested/kino.tmj", base + "../village/wa-headquarters.tmj", base.replace("https:", "http:") + "kino.tmj",
        base.replace("wvh-web", "wvh-web.evil") + "kino.tmj", base.replace("https://", "https://user@") + "kino.tmj",
        "https://wvh-web.github.io/workadventure_outside01/village/wa-headquarters.tmj"])("keeps unrelated source unchanged: %s", url => {
        expect(castleSeatAction(url, "Hinsetzen")).toBeUndefined();
    });
    it.each(["Rutschen", "Rutsche verlassen", "Spielen", "Aufstehen!", " hinsetzen", ""])("keeps other action %s unchanged", message => {
        expect(castleSeatAction(base + "kino.tmj", message)).toBeUndefined();
    });
});

describe("Native keyboard and component lifecycle", () => {
    it.each([" ", "Enter"])("owns focused %s once on key release, not on repeats", key => {
        const activate = vi.fn();
        for (const [type, repeat] of [["keydown", false], ["keydown", true], ["keyup", false]] as const) {
            const event = new KeyboardEvent(type, { key, repeat, cancelable: true });
            const stop = vi.spyOn(event, "stopPropagation");
            handleSeatButtonKey(event, activate);
            expect(event.defaultPrevented).toBe(true); expect(stop).toHaveBeenCalledOnce();
        }
        expect(activate).toHaveBeenCalledOnce();
    });
    it("does not capture movement keys", () => {
        const event = new KeyboardEvent("keyup", { key: "ArrowRight", cancelable: true });
        const activate = vi.fn(); handleSeatButtonKey(event, activate);
        expect(event.defaultPrevented).toBe(false); expect(activate).not.toHaveBeenCalled();
    });
    it("keeps native Space registration, releases it and reacts to room travel", async () => {
        setRoom(base + "kino.tmj");
        const onclick = vi.fn(), addSpaceEventListener = vi.fn(), removeSpaceEventListener = vi.fn();
        const component = mount(PopUpTriggerActionMessage, { target: document.body, props: {
            message: "Aufstehen", onclick, userInputManager: { addSpaceEventListener, removeSpaceEventListener } as never,
        } });
        await tick();
        expect(addSpaceEventListener).toHaveBeenCalledWith(onclick);
        const button = document.querySelector<HTMLButtonElement>("button.castle-seat-action")!;
        expect(button.textContent?.trim()).toBe("Aufstehen");
        button.click(); expect(onclick).toHaveBeenCalledOnce();
        const propagated = vi.fn(); window.addEventListener("keyup", propagated);
        button.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
        button.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true, cancelable: true }));
        expect(onclick).toHaveBeenCalledTimes(2); expect(propagated).not.toHaveBeenCalled();
        window.removeEventListener("keyup", propagated);
        setRoom("https://wvh-web.github.io/workadventure_outside01/village/wa-headquarters.tmj"); await tick();
        expect(document.querySelector("button.castle-seat-action")).toBeNull();
        expect(document.querySelector(".popup-container")?.textContent?.trim()).toBe("Aufstehen");
        setRoom(); await tick(); expect(document.querySelector("button.castle-seat-action")).toBeNull();
        await unmount(component); expect(removeSpaceEventListener).toHaveBeenCalledWith(onclick);
    });
});
