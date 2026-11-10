import { Vox } from "./mesh";

/**
 * Building blocks for the blocky props: walls, stepped roofs, windows,
 * doors, crates, barrels, fences, little trees. Everything is centred on
 * x = 0, z = 0 and stands on y = 0, front to +Z.
 */

export const C = {
	grass: 0x7cc65a, grassDark: 0x5fae48, dirt: 0xb0844f, path: 0xd8c08c,
	cream: 0xf5e6c4, white: 0xf8f3e9, plaster: 0xeedcb6,
	plank: 0xc58d55, plankDark: 0x93613a, log: 0x82552f, logEnd: 0xd9b07a,
	stone: 0xc2beb6, stoneDark: 0x969189, cobble: 0xaca79e, slate: 0x6c7480,
	brick: 0xc65c43, brickDark: 0x9c4433,
	roofRed: 0xdc5a4f, roofOrange: 0xe98a3e, roofBlue: 0x4f82c8, roofGreen: 0x58a55a, roofPurple: 0x9168c0, roofTeal: 0x3fa7a0,
	thatch: 0xe6bb55, thatchDark: 0xc99a3d,
	glass: 0x9fd8f7, glassWarm: 0xffd56e, door: 0x7c4b27, frame: 0xf8f3e9,
	leaf: 0x56b552, leafDark: 0x3e9443, trunk: 0x8a5a33,
	water: 0x5bb8ea, gold: 0xf2c447, iron: 0xc7ced6, steel: 0x8e99a6, dark: 0x3a3a44, coal: 0x2f2f36,
	wheat: 0xf3d061, hay: 0xebc75c, red: 0xe04b4b, blue: 0x4f82c8, pink: 0xff9fb1, purple: 0x9b6bd1, glow: 0xffb347, cyan: 0x4ef0ff
};

/** A rectangular wall block with its top at y + h. */
export function walls (v: Vox, cx: number, y: number, cz: number, w: number, h: number, d: number, c: number): void {
	v.cbox(cx, y, cz, w, h, d, c);
	// Darker corner posts give the blocks a little definition
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.cbox(cx + sx * (w / 2 - 0.5), y, cz + sz * (d / 2 - 0.5), 1.1, h, 1.1, shade(c, 0.86));
}

/** A colour a little darker (k < 1) or lighter. */
export function shade (c: number, k: number): number {
	const r = Math.min(255, Math.round(((c >> 16) & 255) * k)), g = Math.min(255, Math.round(((c >> 8) & 255) * k)), b = Math.min(255, Math.round((c & 255) * k));
	return (r << 16) | (g << 8) | b;
}

/**
 * A stepped gable roof over a w x d block whose walls top out at y, ridge
 * along x (or z when `alongZ`): Minecraft-stairs slopes, gable ends in the
 * wall colour, an overhang all round and a darker ridge.
 */
export function gable (v: Vox, cx: number, y: number, cz: number, w: number, d: number, roof: number, wall: number, alongZ = false): void {
	const t = new Vox();
	const W = alongZ ? d : w, D = alongZ ? w : d;
	const half = D / 2 + 1;
	const steps = Math.ceil(half);
	for (let i = 0; i < steps; i++) {
		const reach = half - i;
		const lip = Math.min(2, reach);
		const c = i % 2 ? roof : shade(roof, 0.93);
		t.box(-W / 2 - 1, y + i, -reach, W + 2, 1, lip, c);
		t.box(-W / 2 - 1, y + i, reach - lip, W + 2, 1, lip, c);
		if (reach - lip > 0) t.box(-W / 2 + 0.01, y + i, -(reach - lip), W - 0.02, 1, 2 * (reach - lip), wall);
	}
	t.box(-W / 2 - 1.2, y + steps - 0.2, -0.8, W + 2.4, 0.8, 1.6, shade(roof, 0.75));
	v.add(t, cx, 0, cz, alongZ ? 1 : 0);
}

/** A stepped pyramid roof (a tower's cap). */
export function pyramid (v: Vox, cx: number, y: number, cz: number, w: number, roof: number, peak = true): void {
	let s = w + 2, i = 0;
	while (s > 1.5) {
		v.cbox(cx, y + i, cz, s, 1, s, i % 2 ? roof : shade(roof, 0.92));
		s -= 2;
		i++;
	}
	if (peak) v.cbox(cx, y + i, cz, 0.8, 2, 0.8, C.gold);
}

/** A flat roof with a low parapet. */
export function flatRoof (v: Vox, cx: number, y: number, cz: number, w: number, d: number, c: number): void {
	v.cbox(cx, y, cz, w + 1, 0.8, d + 1, c);
	v.cbox(cx, y + 0.8, cz - d / 2, w + 1, 1, 0.6, c).cbox(cx, y + 0.8, cz + d / 2, w + 1, 1, 0.6, c);
	v.cbox(cx - w / 2, y + 0.8, cz, 0.6, 1, d + 1, c).cbox(cx + w / 2, y + 0.8, cz, 0.6, 1, d + 1, c);
}

/** Battlements round a w x d top at y. */
export function battlements (v: Vox, cx: number, y: number, cz: number, w: number, d: number, c: number): void {
	for (let x = -w / 2; x <= w / 2 - 1; x += 2) {
		v.box(cx + x, y, cz - d / 2, 1, 1.4, 1, c).box(cx + x, y, cz + d / 2 - 1, 1, 1.4, 1, c);
	}
	for (let z = -d / 2 + 2; z <= d / 2 - 3; z += 2) {
		v.box(cx - w / 2, y, cz + z, 1, 1.4, 1, c).box(cx + w / 2 - 1, y, cz + z, 1, 1.4, 1, c);
	}
}

/** A window on the face at z (front, +Z) or x (side), centred at (a, y). */
export function windowZ (v: Vox, cx: number, y: number, z: number, w = 2, h = 2, c = C.glass): void {
	v.cbox(cx, y - 0.3, z, w + 0.8, h + 0.6, 0.4, C.frame).cbox(cx, y, z + 0.1, w, h, 0.4, c);
	v.cbox(cx, y - 0.6, z + 0.2, w + 1, 0.4, 0.8, shade(C.frame, 0.9));
}

export function windowX (v: Vox, x: number, y: number, cz: number, w = 2, h = 2, c = C.glass): void {
	v.cbox(x, y - 0.3, cz, 0.4, h + 0.6, w + 0.8, C.frame).cbox(x + Math.sign(x) * 0.1, y, cz, 0.4, h, w, c);
}

/** A door on the front face at z. */
export function door (v: Vox, cx: number, y: number, z: number, w = 3, h = 4.5, c = C.door): void {
	v.cbox(cx, y, z, w + 0.8, h + 0.5, 0.3, shade(c, 0.75)).cbox(cx, y, z + 0.1, w, h, 0.4, c).cbox(cx + w / 2 - 0.7, y + h / 2 - 0.2, z + 0.4, 0.5, 0.5, 0.3, C.gold);
}

export function chimney (v: Vox, x: number, y: number, z: number, h: number, c = C.brick): void {
	v.cbox(x, y, z, 2, h, 2, c).cbox(x, y + h, z, 2.4, 0.6, 2.4, shade(c, 0.8));
}

export function crate (v: Vox, x: number, y: number, z: number, s = 3, c = C.plank): void {
	v.cbox(x, y, z, s, s, s, c).cbox(x, y + s * 0.4, z, s + 0.1, s * 0.2, s + 0.1, shade(c, 0.8));
}

export function barrel (v: Vox, x: number, y: number, z: number, h = 3.4, c = C.plankDark): void {
	v.cbox(x, y, z, 2.6, h, 2.6, c).cbox(x, y + 0.5, z, 2.8, 0.4, 2.8, C.steel).cbox(x, y + h - 0.9, z, 2.8, 0.4, 2.8, C.steel);
}

/** A little round tree. */
export function tree (v: Vox, x: number, z: number, s = 1, leaf = C.leaf): void {
	v.cbox(x, 0, z, 1.4 * s, 4 * s, 1.4 * s, C.trunk);
	v.cbox(x, 3.5 * s, z, 5 * s, 3.4 * s, 5 * s, leaf).cbox(x, 6.9 * s, z, 3.4 * s, 1.6 * s, 3.4 * s, shade(leaf, 1.08));
	v.cbox(x + 1.2 * s, 5 * s, z + 2.55 * s, 0.8 * s, 0.8 * s, 0.2, C.pink);
}

export function pine (v: Vox, x: number, z: number, s = 1): void {
	v.cbox(x, 0, z, 1.2 * s, 2.5 * s, 1.2 * s, C.trunk);
	for (let i = 0; i < 4; i++) v.cbox(x, (2 + i * 1.8) * s, z, (6 - i * 1.4) * s, 1.8 * s, (6 - i * 1.4) * s, i % 2 ? C.leafDark : shade(C.leafDark, 0.9));
}

/** A fence along x or z from a to b at the other coordinate c. */
export function fence (v: Vox, axis: "x" | "z", a: number, b: number, c: number, color = C.plank): void {
	const len = b - a;
	for (let p = a; p <= b + 0.01; p += 3) {
		if (axis === "x") v.cbox(p, 0, c, 0.8, 3, 0.8, shade(color, 0.85));
		else v.cbox(c, 0, p, 0.8, 3, 0.8, shade(color, 0.85));
	}
	for (const y of [1.2, 2.3]) {
		if (axis === "x") v.box(a, y, c - 0.25, len, 0.5, 0.5, color);
		else v.box(c - 0.25, y, a, 0.5, 0.5, len, color);
	}
}

/** A flower: a stalk and a coloured head. */
export function flower (v: Vox, x: number, z: number, c = C.pink): void {
	v.cbox(x, 0.5, z, 0.3, 1, 0.3, C.leafDark).cbox(x, 1.4, z, 0.9, 0.7, 0.9, c);
}

/** A simple cottage: walls, door, windows, a gable roof. Returns the roof's top. */
export function cottage (v: Vox, cx: number, cz: number, w: number, d: number, h: number, wall: number, roof: number, opts: { alongZ?: boolean; chimney?: boolean; door?: boolean; lit?: boolean } = {}): number {
	walls(v, cx, 0.5, cz, w, h, d, wall);
	gable(v, cx, h + 0.5, cz, w, d, roof, wall, opts.alongZ);
	if (opts.door !== false) door(v, cx - (w > 7 ? 1.5 : 0), 0.5, cz + d / 2);
	if (w > 7) windowZ(v, cx + w / 2 - 2.3, h * 0.55 + 0.5, cz + d / 2, 2, 2, opts.lit ? C.glassWarm : C.glass);
	if (d > 6) {
		windowX(v, cx + w / 2, h * 0.55 + 0.5, cz, 2, 2, opts.lit ? C.glassWarm : C.glass);
		windowX(v, cx - w / 2, h * 0.55 + 0.5, cz, 2, 2, opts.lit ? C.glassWarm : C.glass);
	}
	if (opts.chimney) chimney(v, cx + w / 2 - 2, h + 1, cz - d / 4, Math.ceil(d / 2) + 2);
	return h + 0.5 + Math.ceil(d / 2 + 1);
}
