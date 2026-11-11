import { Vox } from "./mesh";
import { C, shade } from "./parts";

/**
 * Resource deposits in the blocky pack: little Minecraft-style scenes that
 * say what's there at a glance. Stone flecked with ore (iron, coal, gold),
 * a deer by a bush, a pair of horses, fish at the surface. In "pixels",
 * standing on y = 0, centred on x and z, seen from the front (+Z).
 */

export type DepositLook = "ore" | "coal" | "gold" | "fish" | "game" | "horses";

/** A stone block with flecks of ore on its front, sides and top. */
export function speckled (v: Vox, cx: number, y: number, cz: number, w: number, h: number, d: number, stone: number, fleck: number): void {
	v.cbox(cx, y, cz, w, h, d, stone);
	const out = 0.3;
	// Front and back: loose clusters of flecks, some wide, some tall, like ore in rock
	for (const [a, b, fw, fh] of [[-0.28, 0.66, 1.6, 1], [-0.12, 0.5, 0.9, 0.9], [0.14, 0.26, 1.2, 1.5], [0.32, 0.74, 1, 1.2]]) {
		v.cbox(cx + a * w, y + b * h - fh / 2, cz + d / 2 + out / 2 - 0.01, fw, fh, out, fleck);
		v.cbox(cx - a * w, y + (1 - b) * h - fh / 2, cz - d / 2 - out / 2 + 0.01, fw, fh, out, fleck);
	}
	// Sides
	for (const [a, b, fw, fh] of [[-0.22, 0.4, 1.4, 1], [0.24, 0.72, 1, 1.3]]) {
		v.cbox(cx + w / 2 + out / 2 - 0.01, y + b * h - fh / 2, cz + a * d, out, fh, fw, fleck);
		v.cbox(cx - w / 2 - out / 2 + 0.01, y + (1 - b) * h - fh / 2, cz - a * d, out, fh, fw, fleck);
	}
	// Top
	v.cbox(cx - w * 0.2, y + h - 0.01, cz + d * 0.15, 1.5, out, 1, fleck);
	v.cbox(cx + w * 0.22, y + h - 0.01, cz - d * 0.2, 1, out, 1.3, fleck);
}

function stones (fleck: number, extra?: (v: Vox) => void): Vox {
	const v = new Vox(7);
	const rock = 0x9e9a92;
	speckled(v, -2.2, 0, 0.4, 6.4, 5.6, 6.4, rock, fleck);
	speckled(v, 3.6, 0, 1.6, 4.6, 3.8, 4.6, shade(rock, 0.88), fleck);
	speckled(v, -1.4, 5.6, -0.2, 3.6, 2.8, 3.6, shade(rock, 1.08), fleck);
	extra?.(v);
	return v;
}

/** A four-legged animal side-on (head toward +x): body, legs, neck, head. */
function beast (v: Vox, x: number, z: number, s: number, coat: number, opts: { mane?: number; antlers?: boolean; tail?: number; belly?: number }): void {
	const legH = 3.2 * s, bodyH = 3.2 * s, bodyW = 6.4 * s, bodyD = 2.8 * s;
	for (const lx of [-bodyW / 2 + 0.6 * s, bodyW / 2 - 1.4 * s]) {
		for (const lz of [-bodyD / 2 + 0.5 * s, bodyD / 2 - 0.5 * s]) v.cbox(x + lx + 0.4 * s, 0, z + lz, 0.9 * s, legH + 0.2, 0.9 * s, shade(coat, 0.8));
	}
	v.cbox(x, legH, z, bodyW, bodyH, bodyD, coat);
	if (opts.belly !== undefined) v.cbox(x, legH - 0.01, z, bodyW * 0.7, 0.6 * s, bodyD + 0.02, opts.belly);
	// Neck up from the front of the body, head reaching forward
	const nx = x + bodyW / 2 - 0.6 * s;
	v.cbox(nx, legH + bodyH - 0.5 * s, z, 1.6 * s, 2.6 * s, 1.6 * s, coat);
	const hy = legH + bodyH + 1.4 * s;
	v.cbox(nx + 1.3 * s, hy, z, 3 * s, 1.7 * s, 1.6 * s, coat);
	v.cbox(nx + 2.65 * s, hy + 0.2 * s, z, 0.4 * s, 0.6 * s, 1.0 * s, C.dark);
	// Eyes on both sides
	v.cbox(nx + 1.4 * s, hy + 0.9 * s, z + 0.8 * s + 0.1, 0.4 * s, 0.4 * s, 0.2, C.dark);
	v.cbox(nx + 1.4 * s, hy + 0.9 * s, z - 0.8 * s - 0.1, 0.4 * s, 0.4 * s, 0.2, C.dark);
	// Ears
	v.cbox(nx + 0.3 * s, hy + 1.7 * s, z + 0.5 * s, 0.5 * s, 0.8 * s, 0.4 * s, shade(coat, 0.9));
	v.cbox(nx + 0.3 * s, hy + 1.7 * s, z - 0.5 * s, 0.5 * s, 0.8 * s, 0.4 * s, shade(coat, 0.9));
	if (opts.mane !== undefined) v.cbox(nx - 0.85 * s, legH + bodyH - 0.2 * s, z, 0.5 * s, 3.6 * s, 0.9 * s, opts.mane);
	if (opts.tail !== undefined) v.cbox(x - bodyW / 2 - 0.4 * s, legH + bodyH * 0.25, z, 0.8 * s, bodyH * 0.75, 0.9 * s, opts.tail);
	if (opts.antlers) {
		const ant = shade(C.logEnd, 0.95);
		for (const side of [-1, 1]) {
			const az = z + side * 0.6 * s;
			v.cbox(nx + 0.6 * s, hy + 1.7 * s, az, 0.4 * s, 1.8 * s, 0.4 * s, ant);
			v.cbox(nx + 0.6 * s, hy + 3.1 * s, az + side * 0.6 * s, 0.4 * s, 0.4 * s, 1.4 * s, ant);
			v.cbox(nx + 1.2 * s, hy + 2.5 * s, az, 1.0 * s, 0.4 * s, 0.4 * s, ant);
		}
	}
}

/** A fish at the surface (head toward +x), back and tail out of the water. */
function fish (v: Vox, x: number, z: number, body: number, fin: number): void {
	v.cbox(x, -0.8, z, 5, 2.2, 2.2, body);
	v.cbox(x + 0.4, -0.8, z, 3.4, 0.7, 2.24, shade(body, 1.25));
	v.cbox(x - 3, -0.4, z, 1, 2.8, 0.6, fin);
	v.cbox(x - 0.2, 1.4, z, 2, 0.9, 0.5, fin);
	v.cbox(x + 1.7, 0.4, z + 1.1, 0.5, 0.5, 0.2, C.dark);
	v.cbox(x + 1.7, 0.4, z - 1.1, 0.5, 0.5, 0.2, C.dark);
}

const BUILDERS: Record<DepositLook, () => Vox> = {
	ore: () => stones(0xd98b52),
	coal: () => stones(C.coal),
	gold: () => stones(C.gold, (v) => {
		v.cbox(5.2, 0, -2.6, 1.4, 1, 1.4, C.gold).cbox(6.4, 0, -1.4, 1, 0.8, 1, shade(C.gold, 1.08));
	}),
	fish: () => {
		const v = new Vox(3);
		fish(v, -2.6, 1.2, 0x7fb4d8, 0x5a8fb8);
		fish(v, 3.6, -2.2, 0xf08a3c, 0xe06a2a);
		// Ripples: a broken ring of foam round each
		for (const [x, z] of [[-2.6, 1.2], [3.6, -2.2]]) {
			v.cbox(x - 1, -0.3, z + 2.3, 4, 0.5, 0.6, C.white).cbox(x + 3.4, -0.3, z - 0.4, 0.6, 0.5, 2.6, C.white);
		}
		return v;
	},
	game: () => {
		const v = new Vox(5);
		beast(v, -1, 0, 1, 0xb07040, { antlers: true, tail: C.white, belly: 0xe8d2b0 });
		// A bush beside it
		v.cbox(6.4, 0, 1.6, 3.6, 3, 3.4, C.leafDark).cbox(6.6, 3, 1.4, 2.4, 1.2, 2.2, C.leaf).cbox(5.2, 2, 3.3, 0.7, 0.7, 0.2, C.red);
		return v;
	},
	horses: () => {
		const v = new Vox(9);
		beast(v, -1.4, 1.6, 1, 0x8a5a33, { mane: C.coal, tail: C.coal });
		const foal = new Vox(4);
		beast(foal, 0, 0, 0.72, 0xeee2cc, { mane: 0xb08860, tail: 0xb08860 });
		// The foal faces the other way, behind
		v.add(foal, 3.2, 0, -2.6, 2);
		return v;
	}
};

const cache = new Map<DepositLook, Vox>();

/** A deposit's boxes (built once). */
export function depositVox (look: DepositLook): Vox {
	let v = cache.get(look);
	if (!v) cache.set(look, (v = BUILDERS[look]()));
	return v;
}
