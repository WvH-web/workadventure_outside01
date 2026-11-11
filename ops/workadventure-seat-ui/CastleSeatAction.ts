const castleMaps = new Set([
    "erdgeschoss", "obergeschoss", "kino", "umgebung", "mittelstufe", "grosse-halle", "bibliothek", "grundschule",
    "oberstufe", "spielesaal", "museum", "musikzimmer", "atelier", "sternwarte", "dorf", "park",
    "sternwarte-puzzle-preview",
]);

export function castleSeatAction(mapUrl: string | undefined, message: string): "sit" | "stand" | undefined {
    if (!mapUrl || (message !== "Hinsetzen" && message !== "Aufstehen")) return;
    let url: URL;
    try {
        url = new URL(mapUrl);
    } catch {
        return;
    }
    if (url.origin !== "https://wvh-web.github.io" || url.username || url.password) return;
    const prefix = "/workadventure_outside01/castle/";
    if (!url.pathname.startsWith(prefix) || !url.pathname.endsWith(".tmj")) return;
    if (!castleMaps.has(url.pathname.slice(prefix.length, -4))) return;
    return message === "Hinsetzen" ? "sit" : "stand";
}

export function handleSeatButtonKey(event: KeyboardEvent, activate?: () => void): void {
    if (event.key !== " " && event.key !== "Enter") return;
    // Phaser also listens on window. A focused native button owns this key event.
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "keyup" && !event.repeat) activate?.();
}
