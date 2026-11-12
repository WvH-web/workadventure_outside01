// GPL-3.0-or-later: rendering boundaries for the unmodified upstream EightBall rules.
export class Aim { readonly name = "Aim"; }
export class WatchAim { readonly name = "WatchAim"; }
export class PlaceBall { readonly name = "PlaceBall"; }
export class MatchResultHelper {
    static presentGameEnd(_container: unknown, _rule: string, winner: boolean, reason?: string) {
        return { name: "End", winner, reason: reason ?? null };
    }
}
