import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

const context = vi.hoisted(() => ({
    account: "synthetic-a",
    scene: {} as any,
    mobile: false,
    meeting: false,
}));
vi.mock("../src/front/Phaser/Game/GameManager", () => ({ gameManager: { getCurrentGameScene: () => context.scene } }));
vi.mock("../src/front/Enum/EnvironmentVariable", () => ({ ENABLE_TUTORIAL: true }));
vi.mock("../src/front/Touch/TouchScreenManager", () => ({ touchScreenManager: { get primaryTouchDevice() { return context.mobile; } } }));
vi.mock("../src/front/Connection/LocalUserStore", () => ({ localUserStore: { getLocalUser: () => ({ uuid: context.account }) } }));
vi.mock("../src/front/Stores/MediaStore", () => {
    const store = { subscribe(fn: (value: boolean) => void) { fn(context.meeting); return () => {}; } };
    return { inBbbStore: store, inJitsiStore: store, inLivekitStore: store };
});

const saved = new Map<string, string>();
const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => { saved.set(key, value); },
    removeItem: (key: string) => { saved.delete(key); },
};
function scene(done: boolean | string = false, enabled = true) {
    return { room: { metadata: { enableTutorial: enabled } },
        getPlayerVariablesManager: () => ({ variables: new Map([["tutorialDone", done]]), setVariableFromApp: vi.fn() }),
        getCameraManager: () => ({ stopFollowRemotePlayer: vi.fn() }) };
}
async function fresh() { vi.resetModules(); return (await import("../src/front/Stores/OnboardingStore")).onboardingStore; }
beforeEach(() => { saved.clear(); context.account = "synthetic-a"; context.mobile = false; context.meeting = false; context.scene = scene(); vi.stubGlobal("localStorage", storage); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("one first-entry tutorial across school rooms", () => {
    it("offers the first visit, remembers offering immediately, and does not restart on a new world", async () => {
        const store = await fresh(); expect(store.isCompleted()).toBe(false); store.start(); expect(get(store)).toBe("welcome");
        store.dismiss(); context.scene = scene(); expect(store.isCompleted()).toBe(true); store.start(); expect(get(store)).toBe(null);
        expect((await fresh()).isCompleted()).toBe(true);
    });
    it("keeps separate browser preferences for separate accounts", async () => {
        const store = await fresh(); store.start(); context.account = "synthetic-b"; expect(store.isCompleted()).toBe(false);
        store.start(); context.account = "synthetic-a"; expect(store.isCompleted()).toBe(true);
    });
    it("migrates a completed older world tutorial", async () => {
        context.scene = scene("true"); const store = await fresh(); expect(store.isCompleted()).toBe(true);
        context.scene = scene(); expect((await fresh()).isCompleted()).toBe(true);
    });
    it("does not consume a first offer in a disabled room or an ongoing meeting", async () => {
        context.scene = scene(false, false); const store = await fresh(); store.start(); expect(get(store)).toBe(null);
        context.scene = scene(); context.meeting = true; expect(store.isCompleted()).toBe(true);
        context.meeting = false; expect(store.isCompleted()).toBe(false);
    });
    it("skip and complete both remember the preference", async () => {
        const store = await fresh(); store.skip(); context.scene = scene(); expect(store.isCompleted()).toBe(true);
        store.reset(); expect(store.isCompleted()).toBe(false); store.complete(); expect(store.isCompleted()).toBe(true);
    });
    it("allows explicit replay on desktop and mobile without a second automatic offer", async () => {
        vi.useFakeTimers(); const store = await fresh(); store.complete(); store.restart(); expect(store.isCompleted()).toBe(true);
        vi.advanceTimersByTime(100); expect(get(store)).toBe("welcome"); context.mobile = true; store.restart();
        vi.advanceTimersByTime(100); expect(get(store)).toBe("movement");
    });
    it("falls back to memory when browser storage throws", async () => {
        vi.stubGlobal("localStorage", { getItem() { throw Error("blocked"); }, setItem() { throw Error("quota"); }, removeItem() { throw Error("blocked"); } });
        const store = await fresh(); expect(store.isCompleted()).toBe(false); store.start(); store.dismiss(); context.scene = scene();
        expect(store.isCompleted()).toBe(true); store.restart(); expect(store.isCompleted()).toBe(true);
    });
});
