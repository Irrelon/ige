/**
 * What the zones example's browser page, zone servers and probe share: a
 * strip of space per zone, side by side. Fly off one's edge and you're
 * handed on to the next zone server.
 */

/** Each zone is this wide and tall (world units). */
export const ZONE_WIDTH = 800;
export const ZONE_HEIGHT = 400;
/** Units per second at full stick. */
export const SPEED = 240;

/** Which zone lies past each edge. */
export const NEIGHBOURS: Record<string, { west?: string; east?: string }> = {
	west: { east: "east" },
	east: { west: "west" }
};

export const START_ZONE = "west";

export interface ZonesInput {
	dx: number;
	dy: number;
}

/** A dot in a zone (what replication carries). */
export interface ZonesDot {
	[key: string]: number | string | boolean;
	x: number;
	y: number;
	name: string;
	/** True while it's being handed on to the next zone. */
	leaving: boolean;
}

/** The replicated kinds, the same on the zone servers and the page. A dot may be a little past an edge just before it's handed on. */
export const ZONES_SCHEMAS = {
	dot: {
		x: { type: "number", precision: 0.1 },
		y: { type: "number", precision: 0.1 },
		name: { type: "string" },
		leaving: { type: "bool", blend: false }
	}
} as const;

/** What one player's input is: a direction, each axis from -1 to 1. */
export const ZONES_INPUT_SCHEMA = {
	dx: { type: "number", precision: 0.01, min: -1, max: 1 },
	dy: { type: "number", precision: 0.01, min: -1, max: 1 }
} as const;

/** The scope every dot in a zone is in (and every machine in it sees). */
export const ZONE_SCOPE = "zone";

/** What a ticket into a zone carries: where you arrive, and who you are. */
export interface ZonesArrival {
	x: number;
	y: number;
	name: string;
}

/** What a zone tells each machine as it joins. */
export interface ZonesInfo {
	zone: string;
	width: number;
	height: number;
	west?: string;
	east?: string;
}

/** The zone servers' "go here" event. */
export interface ZonesTransferEvent {
	t: "zone";
	zone: string;
	url: string;
	ticket: string;
}

/** One step of movement (the zone runs it, and the page predicts its own dot with it). */
export function moveDot (dot: ZonesDot, input: ZonesInput, dt: number): ZonesDot {
	if (dot.leaving) return dot;
	const length = Math.hypot(input.dx, input.dy);
	const scale = length > 1 ? 1 / length : 1;
	return {
		...dot,
		// Past an edge is allowed (the zone hands the dot on from there)
		x: dot.x + input.dx * scale * SPEED * dt,
		y: Math.max(0, Math.min(ZONE_HEIGHT, dot.y + input.dy * scale * SPEED * dt))
	};
}
