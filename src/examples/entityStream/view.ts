/**
 * Draws a client's entities top-down with Canvas 2D for the entity streaming examples: pilots as
 * arrowheads, tumblers as wireframe cubes turned by their quaternion, the range the machine sees,
 * and (optionally) the authority's own entities as faint outlines to show how far behind the
 * interpolated picture is. The entities are ordinary IgeEntity objects; this only reads their
 * transform.
 */
import type { IgeEntity } from "@/engine/core/IgeEntity";
import { Pilot, RANGE, Tumbler, WORLD } from "./shared";

export const HUES = ["#ffd166", "#4cc9f0", "#ef476f", "#06d6a0", "#c58bff", "#ff9f43", "#9bde4a", "#f78fb3"];

/** Ground z is squashed to this, and height lifts the picture up. */
const TILT = 0.62;
const LIFT = 0.78;

export interface ViewOptions {
	title: string;
	lines: string[];
	/** The entities the client has. */
	entities: IgeEntity[];
	/** The player's own entity (the view follows it). */
	me?: IgeEntity;
	/** The authority's entities, drawn as faint outlines. */
	ghosts?: IgeEntity[];
	/** Pixels per world unit (default: the range fits the shorter side). */
	scale?: number;
}

const CUBE: [number, number, number][] = [
	[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
	[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
];
const EDGES: [number, number][] = [
	[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]
];

/** Rotates a point by a unit quaternion. */
function rotate (q: { x: number; y: number; z: number; w: number }, x: number, y: number, z: number): [number, number, number] {
	const tx = 2 * (q.y * z - q.z * y), ty = 2 * (q.z * x - q.x * z), tz = 2 * (q.x * y - q.y * x);
	return [
		x + q.w * tx + (q.y * tz - q.z * ty),
		y + q.w * ty + (q.z * tx - q.x * tz),
		z + q.w * tz + (q.x * ty - q.y * tx)
	];
}

export function drawView (ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, view: ViewOptions): void {
	const scale = view.scale ?? Math.min(width, height) / (RANGE * 2.5);
	const centre = view.me?._translate ?? { x: 0, y: 0, z: 0 };
	const originX = left + width / 2, originY = top + height / 2;
	// World (x, y up, z) to the picture
	const sx = (x: number) => originX + (x - centre.x) * scale;
	const sy = (z: number, y: number) => originY + ((z - centre.z) * TILT - y * LIFT) * scale;

	ctx.save();
	ctx.beginPath();
	ctx.rect(left, top, width, height);
	ctx.clip();
	ctx.fillStyle = "#0b0e14";
	ctx.fillRect(left, top, width, height);

	// The ground: a grid, and the edge of the world
	ctx.strokeStyle = "#1b2433";
	ctx.lineWidth = 1;
	const step = 100;
	ctx.beginPath();
	const half = WORLD / 2;
	for (let g = -half; g <= half; g += step) {
		ctx.moveTo(sx(g), sy(-half, 0));
		ctx.lineTo(sx(g), sy(half, 0));
		ctx.moveTo(sx(-half), sy(g, 0));
		ctx.lineTo(sx(half), sy(g, 0));
	}
	ctx.stroke();
	ctx.strokeStyle = "#3a4a66";
	ctx.lineWidth = 2;
	ctx.strokeRect(sx(-half), sy(-half, 0), WORLD * scale, WORLD * TILT * scale);

	// What this machine sees: a circle on the ground round its pilot
	if (view.me) {
		ctx.strokeStyle = "rgba(255, 209, 102, 0.55)";
		ctx.setLineDash([8, 6]);
		ctx.beginPath();
		ctx.ellipse(sx(centre.x), sy(centre.z, 0), RANGE * scale, RANGE * TILT * scale, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	// Far to near, so nearer things cover farther
	const draw = (list: IgeEntity[], ghost: boolean) => {
		const sorted = [...list].sort((a, b) => a._translate.z - b._translate.z);
		for (const entity of sorted) {
			if (entity instanceof Tumbler) drawTumbler(ctx, entity, sx, sy, scale, ghost);
			else if (entity instanceof Pilot) drawPilot(ctx, entity, sx, sy, scale, ghost, entity === view.me);
		}
	};
	if (view.ghosts) draw(view.ghosts, true);
	draw(view.entities, false);

	ctx.fillStyle = "#e6ebf5";
	ctx.font = "bold 15px monospace";
	ctx.textAlign = "left";
	ctx.fillText(view.title, left + 12, top + 22);
	ctx.fillStyle = "#9aa7bf";
	ctx.font = "12px monospace";
	view.lines.forEach((line, i) => ctx.fillText(line, left + 12, top + 40 + i * 16));
	ctx.restore();
}

function drawPilot (ctx: CanvasRenderingContext2D, pilot: Pilot, sx: (x: number) => number, sy: (z: number, y: number) => number, scale: number, ghost: boolean, mine: boolean): void {
	const t = pilot._translate;
	const x = sx(t.x), y = sy(t.z, t.y);
	const heading = pilot._rotate.y;
	const size = 15;
	// Heading 0 faces +z (down the picture); +x is to the right
	const fx = Math.sin(heading), fy = Math.cos(heading) * TILT;
	const px = Math.cos(heading), py = -Math.sin(heading) * TILT;
	const colour = HUES[pilot.hue % HUES.length];
	ctx.beginPath();
	ctx.moveTo(x + fx * size * 1.4, y + fy * size * 1.4);
	ctx.lineTo(x - fx * size * 0.6 + px * size * 0.8, y - fy * size * 0.6 + py * size * 0.8);
	ctx.lineTo(x - fx * size * 0.6 - px * size * 0.8, y - fy * size * 0.6 - py * size * 0.8);
	ctx.closePath();
	if (ghost) {
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 1;
		ctx.stroke();
		return;
	}
	ctx.fillStyle = colour;
	ctx.fill();
	if (mine) {
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 2;
		ctx.stroke();
	}
	ctx.fillStyle = "#c7d0e0";
	ctx.font = "12px monospace";
	ctx.textAlign = "center";
	ctx.fillText(pilot.callsign, x, y - 22 * Math.max(0.8, scale));
	ctx.textAlign = "left";
}

function drawTumbler (ctx: CanvasRenderingContext2D, tumbler: Tumbler, sx: (x: number) => number, sy: (z: number, y: number) => number, scale: number, ghost: boolean): void {
	const t = tumbler._translate;
	const q = tumbler._quaternion ?? { x: 0, y: 0, z: 0, w: 1 };
	const size = 24 * [1, 0.8, 1.15][tumbler.shape % 3];
	const points = CUBE.map(([cx, cy, cz]) => {
		const [rx, ry, rz] = rotate(q, cx * size, cy * size, cz * size);
		return [sx(t.x + rx), sy(t.z + rz, t.y + ry)] as const;
	});
	// A shadow on the ground
	if (!ghost) {
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.beginPath();
		ctx.ellipse(sx(t.x), sy(t.z, 0), size * scale, size * TILT * scale, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.strokeStyle = ghost ? "rgba(255,255,255,0.3)" : ["#5fe3ff", "#6cf29a", "#ff9f43"][tumbler.shape % 3];
	ctx.lineWidth = ghost ? 1 : 2;
	ctx.beginPath();
	for (const [a, b] of EDGES) {
		ctx.moveTo(points[a][0], points[a][1]);
		ctx.lineTo(points[b][0], points[b][1]);
	}
	ctx.stroke();
}
