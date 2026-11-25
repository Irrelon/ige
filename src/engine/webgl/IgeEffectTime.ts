import { ige } from "@/engine/instance";

/**
 * The clock the phase and lens effects read: engine time in seconds, unless a game sets it (`igeEffectTime(t)`), as a
 * recording or a scrubber does so the same picture comes back. Each effect can also hold a time of its own (an effect's
 * `time(t)` wins over this one). `igeEffectTime(null)` goes back to engine time.
 */
let override: number | null = null;

/** Sets (or, with null, releases) the clock every phase and lens effect reads that has no time of its own. */
export function igeEffectTime (t: number | null): void {
	override = t === null || !Number.isFinite(t) ? null : t;
}

/** The time the effects use now, in seconds: the one set with igeEffectTime(), else the engine's. */
export function igeEffectNow (): number {
	if (override !== null) return override;
	return (ige.engine?.currentTime?.() ?? 0) / 1000;
}
