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

/** A dot in a zone (what snapshots carry). */
export interface ZonesDot {
	[key: string]: number | string;
	x: number;
	y: number;
	name: string;
	/** 1 while it's being handed on to the next zone. */
	leaving: number;
}

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
