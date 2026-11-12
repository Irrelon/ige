/**
 * Layers of a zone (IgeZoneDirectory's `layers` option): a busy zone is
 * run as several copies of itself, each its own zone process with its own
 * players, so no one copy holds more than a set number. A layer's zone id
 * is the base zone's with its number after `--` ("valeria--2"); layer 0 is
 * the base zone itself ("valeria"), so a quiet world never sees a layer
 * id at all.
 *
 * The directory places each player entering a zone (or handed on to it)
 * into a layer: the one most of their companions (friends, party, guild:
 * the game says) are in, else the first with room, else a new one. Layers
 * that empty out are merged back: the directory tells one to drain into
 * another (its zone host emits "drain"), the game hands its players over,
 * and the empty layer stops as any idle zone does.
 */

/** Between a zone and its layer number in a layer's zone id. */
export const IGE_LAYER_SEP = "--";

/** The zone id of layer `layer` of `base` (layer 0: the base itself). */
export function igeLayerZone (base: string, layer: number): string {
	return layer > 0 ? `${base}${IGE_LAYER_SEP}${layer}` : base;
}

/** A zone id as its base and layer number ("valeria--2" → valeria, 2; "valeria" → valeria, 0). */
export function igeZoneLayer (zone: string): { base: string; layer: number } {
	const at = zone.lastIndexOf(IGE_LAYER_SEP);
	if (at > 0) {
		const n = Number(zone.slice(at + IGE_LAYER_SEP.length));
		if (Number.isInteger(n) && n > 0 && String(n) === zone.slice(at + IGE_LAYER_SEP.length)) return { base: zone.slice(0, at), layer: n };
	}
	return { base: zone, layer: 0 };
}

/** How a directory layers busy zones. */
export interface IgeZoneLayering {
	/** The most players a layer is placed into (companions joining one another may take it a little over). */
	capacity: number;
	/** Two layers are merged when together they'd fill no more than this share of a layer (default 0.5). */
	mergeBelow?: number;
	/** How long a place given to a player entering a layer holds before their zone's heartbeat counts them (ms, default 30000). */
	reserveMs?: number;
}
