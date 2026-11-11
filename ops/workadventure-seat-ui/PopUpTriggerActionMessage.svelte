<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import IconArmchair from "~icons/tabler/armchair";
    import { IconWalk } from "@wa-icons";
    import type { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import { gameSceneStore } from "../../Stores/GameSceneStore";
    import { castleSeatAction, handleSeatButtonKey } from "./CastleSeatAction";
    import PopUpContainer from "./PopUpContainer.svelte";

    interface Props {
        message: string;
        onclick: () => void;
        userInputManager: UserInputManager;
    }

    let { message, onclick, userInputManager }: Props = $props();
    const seatAction = $derived(castleSeatAction($gameSceneStore?.mapUrlFile, message));

    onMount(() => {
        userInputManager.addSpaceEventListener(onclick);
    });

    onDestroy(() => {
        userInputManager.removeSpaceEventListener(onclick);
    });
</script>

{#if seatAction}
    <button
        type="button"
        class="castle-seat-action"
        data-testid="castle-seat-action"
        onclick={(event) => {
            event.currentTarget.blur();
            onclick();
        }}
        onkeydown={(event) => handleSeatButtonKey(event)}
        onkeyup={(event) => handleSeatButtonKey(event, () => onclick())}
    >
        <span class="seat-icon" aria-hidden="true">
            {#if seatAction === "stand"}<IconWalk />{:else}<IconArmchair />{/if}
        </span>
        <span>{message}</span>
    </button>
{:else}
    <PopUpContainer reduceOnSmallScreen={true} {onclick}>
        {message}
    </PopUpContainer>
{/if}

<style>
    .castle-seat-action {
        position: fixed;
        left: max(16px, env(safe-area-inset-left));
        bottom: max(16px, env(safe-area-inset-bottom));
        z-index: 1000;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 144px;
        max-width: calc(100vw - 32px);
        height: 44px;
        padding: 0 12px;
        border: 1px solid #c6a459;
        border-radius: 6px;
        background: rgba(25, 28, 35, 0.96);
        color: #ffffff;
        box-shadow: 0 2px 8px #0005;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        letter-spacing: 0;
        white-space: nowrap;
        pointer-events: auto;
        cursor: pointer;
        touch-action: manipulation;
    }

    .castle-seat-action:hover { background: #353945; }
    .castle-seat-action:focus-visible { outline: 3px solid #ffffff; outline-offset: 3px; }
    .seat-icon { display: flex; width: 20px; height: 20px; font-size: 20px; }
    .seat-icon :global(svg) { width: 20px; height: 20px; }

    @media (max-width: 767px) {
        .castle-seat-action { bottom: calc(100px + env(safe-area-inset-bottom)); }
    }
</style>
