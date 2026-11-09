type VisitStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A local UI preference, never an authentication or permission decision. */
export class OnboardingVisit {
    private readonly offered = new Set<string>();

    constructor(
        private readonly identity: () => string | null,
        private readonly storage: () => VisitStorage = () => localStorage,
    ) {}

    private key(): string {
        let id: string | null = null;
        try {
            id = this.identity();
        } catch {
            // A temporarily unavailable account still has an in-memory visit.
        }
        return id && id.length <= 256 ? "wvhTutorialOfferedV1:" + encodeURIComponent(id) : "";
    }

    has(): boolean {
        const key = this.key();
        if (this.offered.has(key)) return true;
        try {
            if (key && this.storage().getItem(key) === "1") {
                this.offered.add(key);
                return true;
            }
        } catch {
            // Room changes still work when browser storage is disabled or full.
        }
        return false;
    }

    remember(): void {
        const key = this.key();
        this.offered.add(key);
        try {
            if (key) this.storage().setItem(key, "1");
        } catch {
            // This preference must never break movement or room entry.
        }
    }

    clear(): void {
        const key = this.key();
        this.offered.delete(key);
        try {
            if (key) this.storage().removeItem(key);
        } catch {
            // Explicit replay remains possible in this tab.
        }
    }
}
