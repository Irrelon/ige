import { speckled } from "./deposits";
import { Vox } from "./mesh";
import { barrel, battlements, C, chimney, cottage, crate, door, fence, flatRoof, flower, gable, pine, pyramid, shade, tree, walls, windowX, windowZ } from "./parts";

/**
 * The blocky props: buildings, cities, wonders, monuments, vehicles, the
 * boat and the windmill. They stand straight on the hex tile (no square
 * base of their own, which would look odd on a hexagon). Fronts face +Z.
 */

type Builder = () => Vox;

// ------------------------------------------------------------------
// Bits used by several props
// ------------------------------------------------------------------

function logWalls (v: Vox, cx: number, cz: number, w: number, d: number, h: number): void {
	for (let y = 0.5, i = 0; y < h; y += 1.5, i++) {
		const c = i % 2 ? C.log : shade(C.log, 1.1);
		v.cbox(cx, y, cz - d / 2 + 0.7, w, 1.5, 1.4, c).cbox(cx, y, cz + d / 2 - 0.7, w, 1.5, 1.4, c);
		v.cbox(cx - w / 2 + 0.7, y, cz, 1.4, 1.5, d - 1.4, c).cbox(cx + w / 2 - 0.7, y, cz, 1.4, 1.5, d - 1.4, c);
		for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.cbox(cx + sx * (w / 2 + 0.4), y + 0.2, cz + sz * (d / 2 - 0.7), 0.8, 1.1, 1.1, C.logEnd);
	}
	v.cbox(cx, 0.5, cz, w - 2, h - 0.5, d - 2, C.plankDark);
}

function logPile (v: Vox, x: number, z: number): void {
	for (const [row, n] of [[0, 3], [1, 2], [2, 1]] as const) {
		for (let i = 0; i < n; i++) {
			const px = x + (i - (n - 1) / 2) * 2.2;
			v.cbox(px, 0.5 + row * 2, z, 2, 2, 6, C.log).cbox(px, 0.7 + row * 2, z + 3, 1.6, 1.6, 0.2, C.logEnd);
		}
	}
}

function well (v: Vox, x: number, z: number): void {
	v.cbox(x, 0.5, z, 4, 2.5, 4, C.stone).cbox(x, 2.8, z, 3, 0.3, 3, C.water);
	v.cbox(x - 1.7, 3, z, 0.6, 3.5, 0.6, C.plank).cbox(x + 1.7, 3, z, 0.6, 3.5, 0.6, C.plank);
	pyramid(v, x, 6.3, z, 3, C.roofRed, false);
}

function crops (v: Vox, x0: number, z0: number, rows: number, len: number, c = C.wheat): void {
	for (let r = 0; r < rows; r++) {
		v.box(x0, 0.5, z0 + r * 2.4, len, 0.6, 1.8, C.dirt);
		for (let p = 0; p < len - 0.5; p += 1.6) v.box(x0 + p + 0.2, 1.1, z0 + r * 2.4 + 0.4, 1, 1.4 + ((p * 7 + r) % 3) * 0.3, 1, r % 2 ? c : shade(c, 0.92));
	}
}

function sheep (v: Vox, x: number, z: number, turn = 0): void {
	const s = new Vox();
	s.cbox(0, 1.2, 0, 3, 2.4, 4.2, C.white).cbox(0, 1.8, 2.6, 1.8, 1.8, 1.4, 0x4a3a34);
	s.cbox(-0.5, 2.3, 3.35, 0.4, 0.4, 0.1, 0xffffff).cbox(0.5, 2.3, 3.35, 0.4, 0.4, 0.1, 0xffffff);
	for (const [lx, lz] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) s.cbox(lx, 0, lz, 0.7, 1.3, 0.7, 0x4a3a34);
	v.add(s, x, 0.5, z, turn as 0 | 1 | 2 | 3);
}

function lantern (v: Vox, x: number, z: number, h = 6): void {
	v.cbox(x, 0.5, z, 0.6, h, 0.6, C.dark).cbox(x, h + 0.5, z, 1.4, 1.4, 1.4, C.glassWarm).cbox(x, h + 1.9, z, 1.6, 0.5, 1.6, C.dark);
}

function flag (v: Vox, x: number, y: number, z: number, c: number, h = 5): void {
	v.cbox(x, y, z, 0.5, h, 0.5, C.dark).box(x + 0.25, y + h - 2.2, z - 0.2, 3, 2, 0.4, c);
}

function column (v: Vox, x: number, y: number, z: number, h: number, c = C.white): void {
	v.cbox(x, y, z, 2.2, 0.6, 2.2, c).cbox(x, y + 0.6, z, 1.5, h - 1.2, 1.5, c).cbox(x, y + h - 0.6, z, 2.2, 0.6, 2.2, c);
}

/** A little statue of a hero (a stone chibi). */
function statue (v: Vox, x: number, y: number, z: number, c: number, s = 1): void {
	v.cbox(x, y, z, 3 * s, 1 * s, 3 * s, shade(c, 0.85));
	v.cbox(x, y + 1 * s, z, 1.8 * s, 1.6 * s, 1.2 * s, c).cbox(x, y + 2.6 * s, z, 2.4 * s, 2 * s, 1.6 * s, c).cbox(x, y + 4.6 * s, z, 3 * s, 2.8 * s, 2.8 * s, c);
	v.cbox(x - 1.6 * s, y + 3 * s, z + 0.8 * s, 0.6 * s, 4.5 * s, 0.6 * s, c);
}

function stairs (v: Vox, cx: number, z: number, w: number, n: number, c = C.stone): void {
	for (let i = 0; i < n; i++) v.cbox(cx, 0.5 + i * 0.8, z - i * 1.2, w, 0.8, 1.4 + i * 0.01, i % 2 ? c : shade(c, 0.95));
}

function wheel (v: Vox, x: number, y: number, z: number, r = 2.2, c = C.plankDark): void {
	v.cbox(x, y - r, z, 0.8, r * 2, r * 1.2, c).cbox(x, y - r * 0.6, z, 0.8, r * 1.2, r * 2, c).cbox(x, y - 0.5, z, 1, 1, 1, C.steel);
}

/** A block of quarried stone: courses of blocks in two shades, the joints staggered. */
function cutStone (v: Vox, cx: number, y: number, cz: number, w: number, h: number, d: number): void {
	const rows = Math.max(1, Math.round(h / 1.5));
	const rh = h / rows;
	for (let r = 0; r < rows; r++) {
		const c = r % 2 ? C.stone : shade(C.stone, 0.9);
		v.cbox(cx, y + r * rh, cz, w, rh, d, c);
		// Joints on the front face, staggered course by course
		for (let x = -w / 2 + (r % 2 ? 2 : 3.5); x < w / 2 - 0.5; x += 3.2) v.cbox(cx + x, y + r * rh + 0.1, cz + d / 2 + 0.05, 0.25, rh - 0.2, 0.1, C.stoneDark);
	}
}

function dome (v: Vox, cx: number, y: number, cz: number, w: number, c: number): number {
	let s = w, i = 0;
	while (s > 1) {
		const step = s > w * 0.7 ? 0.8 : s > w * 0.4 ? 1 : 1.4;
		v.cbox(cx, y + i, cz, s, 1, s, i % 2 ? c : shade(c, 0.94));
		s -= step;
		i++;
	}
	v.cbox(cx, y + i, cz, 0.8, 2.4, 0.8, C.gold).cbox(cx, y + i + 2.4, cz, 1.4, 1.4, 1.4, C.gold);
	return y + i + 3.8;
}

// ------------------------------------------------------------------
// Economy buildings
// ------------------------------------------------------------------

const buildings: Record<string, Builder> = {
	woodcutter: () => {
		const v = new Vox(101);
		logWalls(v, -3, -3, 12, 10, 7);
		gable(v, -3, 7.5, -3, 12, 10, C.roofGreen, C.log);
		door(v, -4.5, 0.5, 2);
		windowZ(v, 0, 4.5, 2);
		logPile(v, 6.5, 4);
		v.cbox(-6, 0.5, 7, 3, 2, 3, C.log).cbox(-6, 2.5, 7, 2.6, 0.2, 2.6, C.logEnd).cbox(-5.6, 2.5, 7.3, 0.6, 3.4, 0.6, C.plank).box(-5.9, 4.8, 7.6, 0.6, 1.6, 2, C.iron);
		pine(v, 7.5, -7, 1.1);
		pine(v, 9, -2, 0.8);
		return v;
	},
	quarry: () => {
		const v = new Vox(102);
		// A cut cliff of stone terraces at the back, in courses of blocks, turf on the top
		for (const [x, z, w, d, h] of [[-4, -7, 16, 8, 9], [5, -6, 10, 10, 6], [-7, 1, 8, 8, 4], [2, 2, 8, 6, 2]] as const) {
			cutStone(v, x, 0.5, z, w, h, d);
			if (h > 5) v.cbox(x, h + 0.5, z, w - 0.6, 0.8, d - 0.6, C.grass).cbox(x - w / 4, h + 1.3, z - d / 4, 2, 0.6, 2, C.grassDark);
		}
		// Cut blocks, a cart, a crane
		crate(v, 7, 0.5, 7, 3, C.cobble);
		crate(v, 9.5, 0.5, 6.5, 2.6, shade(C.cobble, 1.08));
		crate(v, 7.5, 3.5, 7, 2.4, shade(C.cobble, 0.94));
		v.cbox(-1, 0.5, 8.5, 5, 1.5, 3, C.plankDark).cbox(-1, 2, 8.5, 5.4, 1.6, 3.4, C.plank).cbox(-1, 3.6, 8.5, 3.5, 1, 2.4, C.stoneDark);
		wheel(v, -3.2, 1.6, 8.5, 1.2);
		wheel(v, 1.2, 1.6, 8.5, 1.2);
		v.cbox(-9, 0.5, 7, 1, 12, 1, C.plank).box(-9, 12, 6.5, 8, 1, 1, C.plank).cbox(-2, 6, 7, 0.3, 6, 0.3, C.dark).cbox(-2, 4.6, 7, 2, 1.4, 2, C.cobble);
		// A pick left by the blocks
		v.cbox(4, 0.5, 9.5, 0.5, 0.5, 3.5, C.plank).cbox(4, 0.5, 11.2, 2.6, 0.5, 0.5, C.steel);
		return v;
	},
	mine: () => {
		const v = new Vox(103);
		// A rocky hill flecked with ore, grass on its shoulders, and a timbered entrance
		const ore = 0xd0743c;
		speckled(v, 0, 0.5, -4, 20, 10, 14, C.stoneDark, ore);
		speckled(v, -2, 10.5, -5, 14, 4, 10, C.stone, C.gold);
		speckled(v, 3, 14.5, -6, 8, 3, 6, C.stoneDark, ore);
		speckled(v, -6, 0.5, 0, 8, 6, 8, C.stone, ore);
		v.cbox(-6, 6.5, 0, 7.6, 0.7, 7.6, C.grass).cbox(7, 10.5, -1.5, 5.6, 0.7, 4.6, C.grass).cbox(-6.5, 14.5, -8, 4.4, 0.6, 3.6, C.grass);
		// The entrance: a dark mouth framed in timber
		v.cbox(0, 0.5, 3.2, 5.4, 6.4, 0.4, 0x1e1a1a);
		v.cbox(-3.1, 0.5, 3.4, 1.2, 7.4, 1.2, C.log).cbox(3.1, 0.5, 3.4, 1.2, 7.4, 1.2, C.log).cbox(0, 7.4, 3.4, 7.6, 1.3, 1.4, C.log);
		v.cbox(0, 8.7, 3.6, 4, 1.6, 0.4, C.plank).cbox(-0.8, 9.1, 3.85, 0.8, 0.8, 0.2, C.dark).cbox(0.8, 9.1, 3.85, 0.8, 0.8, 0.2, C.dark);
		// Rails and an ore cart
		for (let z = 3.5; z < 12; z += 1.6) v.cbox(0, 0.5, z, 4, 0.3, 0.6, C.plankDark);
		v.cbox(-1.2, 0.8, 7.5, 0.4, 0.3, 9, C.steel).cbox(1.2, 0.8, 7.5, 0.4, 0.3, 9, C.steel);
		v.cbox(0, 1.3, 9, 4, 2.4, 3.6, C.steel).cbox(0, 3.5, 9, 3.4, 0.8, 3, ore).cbox(-0.8, 4.2, 9.3, 1, 0.8, 1, C.gold).cbox(0.9, 4.1, 8.5, 0.9, 0.7, 0.9, ore);
		lantern(v, 4.8, 4.8, 4);
		// Ore heaped by the mouth
		v.cbox(-6, 0.5, 6.5, 3, 1.4, 3, ore).cbox(-5.6, 1.9, 6.8, 1.6, 0.8, 1.6, shade(ore, 1.1)).cbox(-8, 0.5, 8, 1.4, 1, 1.4, C.gold);
		return v;
	},
	farm: () => {
		const v = new Vox(104);
		cottage(v, -5, -6, 10, 8, 6, C.cream, C.roofRed, { chimney: true });
		crops(v, -10, 2, 4, 20);
		fence(v, "x", -11, 11, 11.3);
		// A scarecrow
		v.cbox(7, 6.5, -5, 0.6, 2, 0.6, C.plank).cbox(7, 0.5, -5, 0.6, 6, 0.6, C.plank).cbox(7, 4.5, -5, 6, 0.6, 0.6, C.plank);
		v.cbox(7, 3.5, -5, 3, 3, 1.6, C.roofRed).cbox(7, 6.5, -5, 2.6, 2.6, 2.6, C.hay).cbox(7, 9, -5, 4, 0.5, 4, C.thatchDark).cbox(7, 9.5, -5, 2.4, 1.2, 2.4, C.thatchDark);
		v.cbox(6.4, 7.6, -3.7, 0.5, 0.5, 0.1, C.dark).cbox(7.6, 7.6, -3.7, 0.5, 0.5, 0.1, C.dark);
		return v;
	},
	fishery: () => {
		const v = new Vox(105);
		// The hut ashore (back) and a jetty out over the water (front)
		cottage(v, -4, -2, 9, 7, 5.5, C.white, C.roofBlue);
		for (let z = 1; z < 12; z += 1.3) v.cbox(5, 0.6, z, 5, 0.4, 1.1, z % 2.6 < 1.3 ? C.plank : shade(C.plank, 0.9));
		for (const [x, z] of [[2.8, 3], [7.2, 3], [2.8, 10], [7.2, 10]]) v.cbox(x, 0, z, 0.8, 2, 0.8, C.plankDark);
		// A drying rack of fish, a barrel, a little boat
		v.cbox(-9, 0.5, 2, 0.6, 5, 0.6, C.plank).cbox(-3, 0.5, 2, 0.6, 5, 0.6, C.plank).cbox(-6, 5, 2, 6.6, 0.4, 0.4, C.plank);
		for (const x of [-8, -6.5, -5, -3.8]) v.cbox(x, 2.8, 2, 0.7, 2, 0.4, 0x9fc3d8).cbox(x, 2.4, 2, 1, 0.6, 0.5, 0x7fa7c4);
		barrel(v, 8.5, 0.5, -3);
		v.cbox(-6, -0.2, 8, 3.4, 1.4, 6, C.plank).cbox(-6, 0.4, 8, 2.6, 1, 5.2, C.plankDark);
		return v;
	},
	hunter: () => {
		const v = new Vox(106);
		// A hide tent
		for (let i = 0; i < 7; i++) v.cbox(-4, 0.5 + i * 1.2, -4, 12 - i * 1.6, 1.2, 10 - i * 1.2, i % 2 ? 0xc9a173 : 0xb88e60);
		v.cbox(-4, 0.5, 1, 3, 4, 0.3, 0x5a3b28);
		v.cbox(-4, 8.9, -4, 0.6, 3, 0.6, C.plankDark).cbox(-5, 10.5, -4, 0.5, 2, 0.5, C.plankDark).cbox(-3, 10.8, -4, 0.5, 1.8, 0.5, C.plankDark);
		// Antlers over the flap, a drying rack, a campfire
		v.cbox(-4, 7, 1.6, 1, 1, 0.6, 0xf0e2c4).cbox(-5.2, 7.8, 1.6, 0.5, 1.6, 0.5, 0xf0e2c4).cbox(-2.8, 7.8, 1.6, 0.5, 1.6, 0.5, 0xf0e2c4);
		v.cbox(6, 0.5, -6, 0.6, 6, 0.6, C.plank).cbox(10, 0.5, -6, 0.6, 6, 0.6, C.plank).cbox(8, 6, -6, 5, 0.5, 0.5, C.plank).cbox(8, 2.5, -6, 3.4, 3.4, 0.3, 0xcf9f6c);
		for (const [x, z] of [[5, 6], [7, 6], [6, 4.6], [6, 7.4]]) v.cbox(x, 0.5, z, 2.4, 0.8, 0.8, C.log);
		v.cbox(6, 1, 6, 1.6, 1.2, 1.6, C.glow).cbox(6, 2.2, 6, 0.9, 1, 0.9, 0xfff0a0);
		pine(v, 9, 9, 0.8);
		return v;
	},
	pasture: () => {
		const v = new Vox(107);
		fence(v, "x", -11, 11, -11);
		fence(v, "x", -11, 11, 11);
		fence(v, "z", -11, 11, -11);
		fence(v, "z", -11, 11, 11);
		// A little barn, a trough, hay
		v.cbox(-6, 0.5, -6, 8, 6, 6, C.roofRed);
		gable(v, -6, 6.5, -6, 8, 6, C.slate, C.roofRed, true);
		v.cbox(-6, 0.5, -2.9, 3.6, 4.4, 0.3, C.white).cbox(-6, 0.5, -2.8, 3, 3.8, 0.3, C.door);
		v.cbox(5, 0.5, -7, 6, 1.6, 2, C.plankDark).cbox(5, 1.6, -7, 5.4, 0.3, 1.4, C.water);
		v.cbox(7, 0.5, 6, 3, 2.4, 3, C.hay).cbox(4, 0.5, 7, 3, 2.4, 3, shade(C.hay, 0.95)).cbox(5.5, 2.9, 6.5, 3, 2.4, 3, C.hay);
		sheep(v, -3, 4, 0);
		sheep(v, 2, 1, 1);
		sheep(v, -7, 7, 3);
		return v;
	},
	sawmill: () => {
		const v = new Vox(108);
		// An open shed on posts
		for (const [x, z] of [[-9, -8], [5, -8], [-9, 3], [5, 3]]) v.cbox(x, 0.5, z, 1, 8, 1, C.log);
		gable(v, -2, 8.5, -2.5, 16, 12, C.roofOrange, C.log);
		// The saw bench, a log on it, the blade
		v.cbox(-2, 0.5, -2.5, 12, 3, 4, C.plankDark).cbox(-4, 3.5, -2.5, 8, 2.2, 2.2, C.log).cbox(-8, 3.6, -2.5, 0.2, 2, 2, C.logEnd);
		v.cbox(2, 2, -2.5, 0.4, 5, 5, C.iron).cbox(2, 4.2, -2.5, 0.6, 0.8, 0.8, C.dark);
		// Plank stacks
		for (let i = 0; i < 5; i++) v.cbox(7, 0.5 + i * 0.7, 6, 3.4, 0.6, 9, i % 2 ? C.plank : shade(C.plank, 1.08));
		for (let i = 0; i < 3; i++) v.cbox(-7, 0.5 + i * 0.7, 7.5, 9, 0.6, 3, i % 2 ? C.plank : shade(C.plank, 1.08));
		logPile(v, -5, -10);
		return v;
	},
	smelter: () => {
		const v = new Vox(109);
		// A brick furnace tapering up into its stack
		v.cbox(-2, 0.5, -3, 12, 7, 11, C.brick).cbox(-2, 7.5, -3, 9, 4, 8, C.brickDark).cbox(-2, 11.5, -3, 5, 6, 5, C.brick).cbox(-2, 17.5, -3, 5.6, 1, 5.6, C.brickDark);
		v.cbox(-2, 0.5, 2.6, 5, 4, 0.4, 0x2a1d18).cbox(-2, 0.7, 2.7, 3.6, 2.6, 0.4, C.glow).cbox(-2, 1, 2.8, 2, 1.4, 0.4, 0xfff0a0);
		v.cbox(-2, 18.5, -3, 3, 1.4, 3, 0x9d9d9d).cbox(-1.5, 20.2, -3.5, 2, 1.2, 2, 0xc4c4c4);
		// Ore in, ingots out
		v.cbox(7.5, 0.5, -6, 5, 2, 5, 0xd0743c).cbox(7.5, 2.5, -6, 3, 1.4, 3, shade(0xd0743c, 0.9));
		for (let i = 0; i < 3; i++) v.cbox(7, 0.5 + i * 0.8, 6 - i * 0.2, 4 - i, 0.8, 2, C.iron);
		barrel(v, -9, 0.5, 7, 3, C.coal);
		return v;
	},
	mill: () => {
		const v = millBody();
		const hub = millHub(v);
		v.add(millSails(), 0, hub.y, hub.z + 1.7);
		return v;
	},
	mint: () => {
		const v = new Vox(110);
		walls(v, 0, 0.5, -3, 18, 9, 12, C.stone);
		flatRoof(v, 0, 9.5, -3, 18, 12, C.stoneDark);
		// A pediment with a great gold coin
		for (let i = 0; i < 4; i++) v.cbox(0, 10.5 + i, 3, 18 - i * 4.4, 1, 1.4, C.white);
		v.cbox(0, 11, 3.8, 3.2, 3.2, 0.6, C.gold).cbox(0, 11.6, 4.2, 2, 2, 0.3, shade(C.gold, 0.88));
		for (const x of [-7.5, -3, 3, 7.5]) column(v, x, 0.5, 4, 10, C.white);
		door(v, 0, 0.5, 3, 3.4, 5.5, 0x8a5a2b);
		stairs(v, 0, 7.5, 12, 1);
		for (let i = 0; i < 3; i++) v.cbox(-8, 0.5 + i * 0.9, 9, 4 - i, 0.9, 2, C.gold);
		return v;
	},
	toolsmith: () => {
		const v = new Vox(111);
		cottage(v, -2, -5, 14, 9, 7, C.plaster, C.slate, { chimney: true });
		// A striped awning, the anvil, a rack of tools
		for (let i = 0; i < 6; i++) v.box(-9 + i * 2.33, 6.5, -0.5, 2.33, 0.5, 4, i % 2 ? C.white : C.blue);
		v.cbox(-6, 0.5, 3, 0.5, 6, 0.5, C.plank).cbox(2, 0.5, 3, 0.5, 6, 0.5, C.plank);
		v.cbox(5, 0.5, 6, 2, 2, 2, C.log).cbox(5, 2.5, 6, 3.6, 1.6, 2, C.dark).cbox(6.8, 3, 6, 1, 0.8, 1, C.dark);
		v.cbox(-6, 0.5, 6, 6, 4, 0.6, C.plankDark);
		for (const [x, c] of [[-8, C.steel], [-6.5, C.iron], [-5, C.steel], [-3.5, C.iron]] as const) v.cbox(x, 1.5, 6.4, 0.5, 3, 0.3, C.plank).cbox(x, 4, 6.4, 1.2, 0.8, 0.3, c);
		barrel(v, 9, 0.5, -1);
		return v;
	},
	armoury: () => {
		const v = new Vox(112);
		walls(v, 0, 0.5, -3, 18, 9, 12, C.stoneDark);
		v.cbox(0, 9.5, -3, 18, 0.6, 12, C.stoneDark);
		battlements(v, 0, 10.1, -3, 18, 12, C.stoneDark);
		door(v, 0, 0.5, 3, 4, 6, 0x6e4a2b);
		// Shields on the wall, a spear rack, a dummy
		for (const [x, c] of [[-6, C.red], [6, C.blue]] as const) v.cbox(x, 4, 3.1, 3.2, 3.6, 0.5, c).cbox(x, 5.4, 3.5, 1, 1, 0.3, C.gold);
		v.cbox(-6, 0.5, 8, 6, 0.6, 1.2, C.plankDark).cbox(-6, 4, 8, 6, 0.6, 1.2, C.plankDark);
		for (const x of [-8, -6.5, -5, -3.5]) v.cbox(x, 0.5, 8, 0.4, 9, 0.4, C.plank).cbox(x, 9.5, 8, 0.6, 1.4, 0.3, C.iron);
		v.cbox(7, 0.5, 8, 0.6, 5, 0.6, C.plank).cbox(7, 4, 8, 4, 0.6, 0.6, C.plank).cbox(7, 3, 8, 2.4, 3, 1.6, C.hay).cbox(7, 6, 8, 2, 2, 2, C.hay);
		flag(v, 7, 10.1, -7, C.red);
		return v;
	},
	bakery: () => {
		const v = new Vox(113);
		cottage(v, -2, -4, 13, 9, 7, C.cream, C.roofOrange, { chimney: true, lit: true });
		// The bread oven: a brick dome glowing at its mouth
		v.cbox(8, 0.5, -3, 6, 2, 6, C.brick).cbox(8, 2.5, -3, 5, 2, 5, C.brickDark).cbox(8, 4.5, -3, 3.4, 1.2, 3.4, C.brick).cbox(8, 5.7, -3, 1.6, 0.8, 1.6, C.brickDark);
		v.cbox(8, 2.5, -0.4, 2.4, 1.8, 0.3, 0x2a1d18).cbox(8, 2.7, -0.3, 1.6, 1.2, 0.3, C.glow);
		// A big loaf over the door, and loaves on a table
		v.cbox(-3, 8, 0.8, 5, 2, 1.6, 0xd99a4e).cbox(-3, 9.6, 0.8, 4, 0.6, 1.4, 0xf0c27a);
		v.cbox(5, 0.5, 6, 6, 2.6, 3, C.plank);
		for (const x of [3.3, 5, 6.7]) v.cbox(x, 3.1, 6, 1.4, 0.9, 2.2, 0xd99a4e);
		flower(v, -8, 2.5);
		flower(v, -7, 3.4, C.purple);
		return v;
	},
	steelworks: () => {
		const v = new Vox(114);
		walls(v, -2, 0.5, -2, 16, 10, 14, C.brickDark);
		gable(v, -2, 10.5, -2, 16, 14, C.slate, C.brickDark);
		for (const x of [-8, -2, 4]) windowZ(v, x, 5, 5, 3, 3, C.glassWarm);
		chimney(v, 8, 0.5, -6, 22, C.brick);
		chimney(v, 8, 0.5, 0, 17, C.brick);
		v.cbox(8, 22.8, -6, 3, 1.4, 3, 0x9d9d9d).cbox(8, 18.2, 0, 2.6, 1.2, 2.6, 0xb4b4b4);
		v.cbox(-9, 0.5, 8, 4, 4, 4, C.dark).cbox(-9, 4.5, 8, 3.2, 0.4, 3.2, C.glow);
		for (let i = 0; i < 3; i++) v.cbox(3, 0.5 + i, 8.5, 6, 1, 2.4, C.steel);
		return v;
	},
	powderMill: () => {
		const v = new Vox(115);
		logWalls(v, -2, -4, 13, 9, 7);
		gable(v, -2, 7.5, -4, 13, 9, C.slate, C.log);
		door(v, -2, 0.5, 0.5);
		for (const [x, z] of [[6, 4], [8.6, 4], [7.3, 6.4], [-8, 5]]) barrel(v, x, 0.5, z, 3.4, 0x2b2b30);
		v.cbox(7.3, 4, 4.4, 1, 0.8, 0.8, C.red);
		flag(v, 4, 7.5, -8, C.red, 7);
		return v;
	},
	factory: () => {
		const v = new Vox(116);
		walls(v, 0, 0.5, -1, 20, 8, 16, C.brick);
		// A sawtooth roof, the glazed slopes facing front
		for (let i = 0; i < 4; i++) {
			const z = -8 + i * 4;
			for (let k = 0; k < 4; k++) v.box(-10, 8.5 + k, z + k, 20, 1, 4 - k, C.slate);
			v.box(-10, 8.5, z + 3.6, 20, 4, 0.4, C.glass);
		}
		for (const x of [-6, 0, 6]) windowZ(v, x, 4, 7, 3, 3);
		door(v, 8, 0.5, 7, 3, 5);
		chimney(v, -8, 12.5, -7, 9, C.brickDark);
		chimney(v, -4, 12.5, -7, 7, C.brickDark);
		return v;
	},
	electronicsWorks: () => {
		const v = new Vox(117);
		walls(v, 0, 0.5, -2, 18, 10, 14, 0xf0f3f6);
		v.cbox(0, 4, 5.1, 18, 3, 0.4, C.cyan).cbox(0, 4.5, 5.2, 17, 2, 0.4, 0xbff6ff);
		flatRoof(v, 0, 10.5, -2, 18, 14, 0xdfe5eb);
		// A dish and an antenna
		v.cbox(5, 11.5, -5, 1, 3, 1, C.steel).cbox(5, 14, -4.5, 5, 0.6, 5, 0xf0f3f6).cbox(5, 14.6, -4.5, 3, 0.6, 3, 0xf0f3f6).cbox(5, 15.2, -4.5, 0.5, 2, 0.5, C.steel);
		v.cbox(-5, 11.5, -6, 0.6, 9, 0.6, C.steel).cbox(-5, 20.5, -6, 1.2, 1.2, 1.2, C.red);
		door(v, -5, 0.5, 5, 3, 3.5, 0x3a4250);
		for (const x of [3, 7]) v.cbox(x, 0.5, 8, 2.6, 2.6, 2.6, C.white).cbox(x, 3.1, 8, 1.6, 0.3, 1.6, C.cyan);
		return v;
	},
	warehouse: () => {
		const v = new Vox(118);
		walls(v, 0, 0.5, -3, 18, 8, 12, C.roofRed);
		gable(v, 0, 8.5, -3, 18, 12, C.slate, C.roofRed);
		// Big double doors with the cross braces
		v.cbox(0, 0.5, 3.1, 7, 6.5, 0.3, C.white).cbox(-1.7, 0.5, 3.2, 3.2, 6, 0.3, C.door).cbox(1.7, 0.5, 3.2, 3.2, 6, 0.3, C.door);
		v.cbox(-1.7, 3.2, 3.5, 3, 0.5, 0.2, C.white).cbox(1.7, 3.2, 3.5, 3, 0.5, 0.2, C.white);
		windowZ(v, -6.5, 5, 3);
		windowZ(v, 6.5, 5, 3);
		crate(v, -7, 0.5, 7);
		crate(v, -4, 0.5, 7.5, 2.6, shade(C.plank, 1.1));
		crate(v, -6, 3.5, 7.2, 2.6);
		barrel(v, 6, 0.5, 7);
		barrel(v, 8.6, 0.5, 6.6);
		v.cbox(7.3, 3.9, 6.8, 2.4, 2.4, 2.4, C.wheat);
		return v;
	},
	market: () => {
		const v = new Vox(119);
		// Three stalls with striped awnings and their wares
		const stalls: [number, number, number, number][] = [[-6.5, -5, C.red, 0], [6.5, -5, C.blue, 1], [0, 6, C.roofGreen, 2]];
		for (const [x, z, c, k] of stalls) {
			v.cbox(x, 0.5, z, 8, 3, 4, C.plank).cbox(x, 3.5, z, 8.4, 0.4, 4.4, C.plankDark);
			for (const [sx, sz] of [[-3.6, -1.8], [3.6, -1.8], [-3.6, 1.8], [3.6, 1.8]]) v.cbox(x + sx, 3.5, z + sz, 0.5, 4, 0.5, C.plank);
			for (let i = 0; i < 6; i++) v.box(x - 4.5 + i * 1.5, 7.5 - (i % 2) * 0.3, z - 3, 1.5, 0.6, 6.4, i % 2 ? C.white : c);
			const wares = [[C.red, 0xffa53c, C.wheat], [0x6fd46b, C.purple, C.red], [0xd99a4e, C.gold, C.white]][k];
			wares.forEach((w, i) => v.cbox(x - 2.4 + i * 2.4, 3.9, z + 0.6, 1.8, 1.2, 1.8, w));
		}
		barrel(v, 0, 0.5, -8);
		crate(v, -10, 0.5, 6, 2.6);
		crate(v, 10, 0.5, 6, 2.6, shade(C.plank, 1.1));
		return v;
	},
	port: () => {
		const v = new Vox(120);
		// A wooden quay out over the water, a crane, cargo, a storehouse ashore
		v.cbox(0, 0, -9, 18, 0.8, 8, C.cobble);
		for (let z = -5; z < 12; z += 1.4) v.cbox(0, 0.2, z, 12, 0.5, 1.2, Math.round(z / 1.4) % 2 ? C.plank : shade(C.plank, 0.92));
		for (const [x, z] of [[-5.5, -3], [5.5, -3], [-5.5, 5], [5.5, 5], [-5.5, 11], [5.5, 11]]) v.cbox(x, 0, z, 1, 1.5, 1, C.plankDark);
		cottage(v, -6, -9, 10, 6, 5, C.white, C.roofBlue);
		v.cbox(4, 0.7, 2, 1.2, 14, 1.2, C.plankDark).box(4, 14, 1, 1, 1, 9, C.plankDark).cbox(4.5, 8, 9.5, 0.3, 6, 0.3, C.dark);
		crate(v, 4.5, 6, 9.5, 2.4, C.roofRed);
		crate(v, -3, 0.7, 4, 3);
		crate(v, -3, 3.7, 4, 2.4, shade(C.plank, 1.1));
		barrel(v, -3, 0.7, 7.5);
		for (const x of [-5, 5]) v.cbox(x, 0.7, 11.6, 1, 1.6, 1, C.dark);
		return v;
	}
};

// ------------------------------------------------------------------
// The windmill (body and sails turn separately in game)
// ------------------------------------------------------------------

/**
 * Where the sails' hub sits on the body: WINDMILL in worldView puts it 0.85 / 1.2 of the body's
 * height up and 0.27 / 1.2 of it forward, so it is worked out from the finished body's size.
 */
function millHub (body: Vox): { y: number; z: number } {
	let lo = Infinity, hi = -Infinity;
	for (const b of body.boxes) {
		lo = Math.min(lo, b.y);
		hi = Math.max(hi, b.y + b.h);
	}
	return { y: lo + ((hi - lo) * 0.85) / 1.2, z: ((hi - lo) * 0.27) / 1.2 };
}

function millBody (): Vox {
	const v = new Vox(130);
	// A tapering white tower and its thatched cap
	for (const [y, h, w] of [[0.5, 8, 13], [8.5, 7, 12], [15.5, 6, 11]] as const) walls(v, 0, y, 0, w, h, w, C.white);
	v.cbox(0, 21.5, 0, 12, 1, 12, C.plankDark);
	for (let i = 0; i < 6; i++) v.cbox(0, 22.5 + i, -0.5, 11 - i * 1.8, 1, 12 - i * 1.6, i % 2 ? C.thatch : C.thatchDark);
	door(v, 0, 0.5, 6.5, 3, 5);
	windowZ(v, 0, 11, 6, 2, 2);
	windowX(v, 6, 4, 0);
	v.cbox(-8, 0.5, 6, 3, 3, 3, C.wheat).cbox(-8, 3.5, 6, 2.6, 0.8, 2.6, shade(C.wheat, 0.9));
	// The axle box the sails turn on, reaching out to the hub
	const hub = millHub(v);
	v.box(-1.2, hub.y - 1.2, 5.5, 2.4, 2.4, hub.z - 5.5 + 0.8, C.plankDark);
	return v;
}

function millSails (): Vox {
	const v = new Vox(131);
	// Four blades round a hub, the frame dark and the sailcloth light, centred on (0, 0)
	v.cbox(0, -1.2, 0, 2.4, 2.4, 1.6, C.plankDark);
	const blade = new Vox();
	blade.box(-0.5, 1, -0.3, 1, 13, 0.6, C.plankDark).box(0.6, 3, -0.2, 3.4, 10, 0.4, C.white);
	for (let y = 4; y < 13; y += 3) blade.box(0.6, y, -0.25, 3.4, 0.4, 0.5, C.plankDark);
	blade.box(0.5, 13, -0.3, 3.6, 0.4, 0.6, C.plankDark);
	// Turn copies of the blade round the hub (about z): up, right, down, left
	for (let k = 0; k < 4; k++) {
		for (const b of blade.boxes) {
			let { x, y, w, h } = b;
			for (let i = 0; i < k; i++) [x, y, w, h] = [y, -(x + w), h, w];
			v.box(x, y, b.z, w, h, b.d, b.c);
		}
	}
	return v;
}

// ------------------------------------------------------------------
// Cities and building sites
// ------------------------------------------------------------------

const cities: Record<string, Builder> = {
	village: () => {
		const v = new Vox(140);
		v.cbox(0, 0.5, 0, 5, 0.2, 18, C.path).cbox(0, 0.5, 0, 18, 0.2, 4, C.path);
		cottage(v, -8, -8, 9, 8, 5.5, C.cream, C.thatch, { chimney: true, lit: true });
		cottage(v, 8, -7, 8, 7, 5, C.plaster, C.thatch, { alongZ: true });
		cottage(v, -8, 8, 8, 7, 5, C.cream, C.thatchDark);
		well(v, 6.5, 6.5);
		tree(v, 12, 12, 0.9);
		tree(v, -13, 1, 0.8);
		fence(v, "x", 3, 12, -13.5);
		flower(v, -3, 10);
		flower(v, -2, 12, C.purple);
		flower(v, 3, -2.5, C.gold);
		return v;
	},
	town: () => {
		const v = new Vox(141);
		v.cbox(0, 0.5, 0, 6, 0.2, 20, C.cobble).cbox(0, 0.5, 0, 20, 0.2, 5, C.cobble);
		cottage(v, -9, -9, 10, 8, 7, C.cream, C.roofRed, { chimney: true, lit: true });
		cottage(v, 9, -9, 9, 9, 6, C.white, C.roofBlue, { alongZ: true, lit: true });
		cottage(v, -9, 9, 9, 8, 6, C.plaster, C.roofOrange);
		// A bell tower
		walls(v, 9, 0.5, 9, 7, 14, 7, C.stone);
		windowZ(v, 9, 11, 12.5, 2.4, 3, C.dark);
		v.cbox(9, 10.6, 12.6, 1.4, 1.4, 0.6, C.gold);
		pyramid(v, 9, 14.5, 9, 7, C.roofRed);
		door(v, 9, 0.5, 12.5, 2.6, 4);
		lantern(v, -3.8, 4, 5);
		lantern(v, 3.8, -4, 5);
		tree(v, -14, 0, 0.8);
		tree(v, 14, 0, 0.8);
		return v;
	},
	city: () => {
		const v = new Vox(142);
		// The keep, with corner towers
		walls(v, 0, 0.5, -3, 14, 16, 12, C.stone);
		v.cbox(0, 16.5, -3, 14, 0.6, 12, C.stoneDark);
		battlements(v, 0, 17.1, -3, 14, 12, C.stone);
		for (const [x, z] of [[-7, -9], [7, -9], [-7, 3], [7, 3]]) {
			walls(v, x, 0.5, z, 5, 20, 5, C.stoneDark);
			pyramid(v, x, 20.5, z, 5, C.roofBlue);
		}
		door(v, 0, 0.5, 3, 4, 6, 0x6e4a2b);
		for (const x of [-3.5, 3.5]) windowZ(v, x, 11, 3, 2, 3, C.glassWarm);
		flag(v, 0, 17.7, -3, C.red, 7);
		// Houses about the castle
		cottage(v, -11, 10, 9, 7, 6, C.cream, C.roofRed, { lit: true });
		cottage(v, 11, 10, 9, 7, 6, C.white, C.roofOrange, { lit: true });
		cottage(v, -13, -4, 6, 10, 6, C.plaster, C.roofGreen, { alongZ: true });
		cottage(v, 13, -4, 6, 10, 6, C.cream, C.roofPurple, { alongZ: true });
		lantern(v, -3, 9, 5);
		lantern(v, 3, 9, 5);
		return v;
	},
	construction: () => {
		const v = new Vox(143);
		// A half-built wall in scaffolding
		v.cbox(-2, 0.5, -3, 14, 5, 10, C.stone);
		v.cbox(-6, 5.5, -3, 6, 2, 10, C.stone);
		for (const [x, z] of [[-9.5, -8.5], [5.5, -8.5], [-9.5, 2.5], [5.5, 2.5]]) v.cbox(x, 0.5, z, 0.8, 12, 0.8, C.plank);
		v.cbox(-2, 8, 2.5, 16, 0.5, 2, C.plankDark).cbox(-2, 8, -8.5, 16, 0.5, 2, C.plankDark);
		v.cbox(-2, 12.5, 2.5, 16, 0.5, 0.6, C.plank).cbox(-2, 12.5, -8.5, 16, 0.5, 0.6, C.plank);
		// A ladder, cargo, a little sign
		v.cbox(7, 0.5, 4, 0.4, 8, 0.4, C.plank).cbox(8.6, 0.5, 4, 0.4, 8, 0.4, C.plank);
		for (let y = 1.5; y < 8; y += 1.5) v.cbox(7.8, y, 4, 1.6, 0.3, 0.3, C.plank);
		crate(v, 6, 0.5, 8.5);
		crate(v, 9, 0.5, 8, 2.4, shade(C.plank, 1.1));
		v.cbox(-6, 0.5, 8, 4, 1.4, 3, C.stoneDark).cbox(-6, 1.9, 8, 3, 1.2, 2, C.stone);
		v.cbox(-1, 0.5, 9, 0.5, 3, 0.5, C.plank).cbox(-1, 3, 9.2, 3.6, 2, 0.4, C.gold).cbox(-1, 3.6, 9.45, 2.4, 0.8, 0.2, C.dark);
		return v;
	}
};

// ------------------------------------------------------------------
// World wonders (tall: drawn 1.25 tiles wide, 1.7 high)
// ------------------------------------------------------------------

const wonders: Record<string, Builder> = {
	greatLibrary: () => {
		const v = new Vox(150);
		walls(v, 0, 0.5, -3, 22, 12, 16, C.white);
		flatRoof(v, 0, 12.5, -3, 22, 16, shade(C.white, 0.94));
		for (const x of [-9, -5, -1.5, 1.5, 5, 9]) column(v, x, 0.5, 6, 12);
		v.cbox(0, 12.5, 6, 24, 1, 2.4, C.white);
		for (let i = 0; i < 4; i++) v.cbox(0, 13.5 + i, 6, 22 - i * 5, 1, 2, C.white);
		// Coloured book spines through the windows, and a dome of learning
		for (const [x, c] of [[-7, C.red], [-6, C.blue], [-5, C.gold], [5, C.roofGreen], [6, C.purple], [7, C.red]] as const) v.cbox(x, 5, 5.1, 0.8, 3, 0.4, c);
		dome(v, 0, 13.3, -4, 12, C.roofBlue);
		stairs(v, 0, 12, 18, 2);
		return v;
	},
	greatWall: () => {
		const v = new Vox(151);
		// A long wall between two towers, a gate in the middle
		v.cbox(0, 0.5, 0, 30, 8, 5, C.stone);
		battlements(v, 0, 8.5, 0, 30, 5, C.stone);
		v.cbox(0, 0.5, 2.6, 5, 5.5, 0.4, 0x3a2a20).cbox(0, 6, 2.6, 6, 1, 0.6, C.stoneDark);
		for (const x of [-12, 12]) {
			walls(v, x, 0.5, 0, 7, 14, 7, C.stoneDark);
			v.cbox(x, 14.5, 0, 8, 0.8, 8, C.stoneDark);
			battlements(v, x, 15.3, 0, 8, 8, C.stoneDark);
			pyramid(v, x, 16.7, 0, 6, C.roofRed);
			windowZ(v, x, 9, 3.5, 1.4, 2.4, C.dark);
		}
		flag(v, 0, 9.9, -1, C.red, 6);
		return v;
	},
	colossus: () => {
		const v = new Vox(152);
		// A stepped plinth with a gold band
		v.cbox(0, 0.5, 0, 15, 2.5, 15, C.stone).cbox(0, 3, 0, 13, 2, 13, C.white).cbox(0, 3.6, 6.55, 9, 0.8, 0.2, C.gold);
		// A giant bronze chibi, legs planted wide, a spear in one hand and a torch held high in the other
		const BR = 0xd39a52, BRD = 0xa8702f, BRL = 0xe8b46a, EYE = 0x4a2c12;
		for (const x of [-2.8, 2.8]) v.cbox(x, 5, 0, 3, 6.5, 3.4, BR).cbox(x, 5, 0.3, 3.3, 1.2, 3.8, BRD);
		// Pleated kilt, belted tunic, a cloak down the back
		for (let i = 0; i < 5; i++) v.cbox(-3.6 + i * 1.8, 10.5, 0, 1.8, 3, 5.6, i % 2 ? BR : BRD);
		v.cbox(0, 13.5, 0, 8, 5.5, 5, BR).cbox(0, 13.5, 0, 8.3, 1, 5.3, BRD).cbox(0, 15.6, 2.55, 3, 2.4, 0.2, BRL);
		v.cbox(0, 9, -3, 9, 9.5, 0.8, BRD);
		// The head: big and round-faced, with a calm face and a crown of sun rays
		v.cbox(0, 19, 0, 10, 8.5, 9, BR).cbox(0, 26, 0, 10.4, 1.4, 9.4, BRD);
		v.cbox(-2.3, 22, 4.55, 1.3, 1.9, 0.2, EYE).cbox(2.3, 22, 4.55, 1.3, 1.9, 0.2, EYE).cbox(0, 20.2, 4.55, 2, 0.5, 0.2, BRD);
		for (const [x, z] of [[-4, 4], [0, 4.4], [4, 4], [-5, 0], [5, 0], [-4, -4], [0, -4.4], [4, -4]] as const) {
			v.cbox(x, 27.4, z, 1.2, x === 0 ? 4 : 3, 1.2, C.gold).cbox(x, 27.4 + (x === 0 ? 4 : 3), z, 0.6, 0.8, 0.6, BRL);
		}
		// Torch arm raised beside the head
		v.cbox(6.3, 14.5, 0, 2.6, 4, 2.6, BR).cbox(6.6, 18.5, 0, 2.4, 9, 2.4, BR).cbox(6.6, 27.5, 0, 3, 2, 3, BRL);
		v.cbox(6.6, 29.5, 0, 1.4, 3, 1.4, BRD).cbox(6.6, 32.5, 0, 3, 1, 3, C.gold).cbox(6.6, 33.5, 0, 2.2, 2.2, 2.2, C.glow).cbox(6.6, 35.7, 0, 1.2, 1.4, 1.2, 0xfff0a0);
		// Spear arm down the other side
		v.cbox(-6.2, 12.5, 0, 2.6, 6.5, 2.6, BR).cbox(-6.2, 11, 0, 3, 2, 3, BRL);
		v.cbox(-6.2, 4.6, 0, 0.9, 25, 0.9, BRD).cbox(-6.2, 29.6, 0, 1.6, 2.4, 1.6, C.gold).cbox(-6.2, 32, 0, 0.8, 1.2, 0.8, C.gold);
		return v;
	},
	hangingGardens: () => {
		const v = new Vox(153);
		// Stepped terraces, green spilling over every edge, waterfalls
		for (const [y, w, h] of [[0.5, 24, 7], [7.5, 18, 7], [14.5, 12, 7], [21.5, 6, 4]] as const) {
			v.cbox(0, y, 0, w, h, w, 0xe2c58f);
			v.cbox(0, y + h, 0, w + 0.4, 0.8, w + 0.4, C.grass);
			for (let x = -w / 2; x < w / 2; x += 2) {
				const len = 2 + ((x * 13 + y) % 4);
				v.box(x, y + h - len, w / 2, 1.4, len, 0.6, C.leaf).box(x, y + h - len * 0.7, -w / 2 - 0.6, 1.4, len * 0.7, 0.6, C.leafDark);
			}
			if (w > 8) tree(v, w / 2 - 2.5, w / 2 - 2.5, 0.7);
			if (w > 8) tree(v, -w / 2 + 2.5, -w / 2 + 2.5, 0.7);
			v.box(-1, y, w / 2 + 0.1, 2, h, 0.5, C.water);
		}
		v.cbox(0, 26.3, 0, 4, 0.6, 4, C.water);
		flower(v, 3, 3, C.pink);
		return v;
	},
	grandBazaar: () => {
		const v = new Vox(154);
		walls(v, 0, 0.5, -2, 22, 10, 18, 0xf2dcae);
		flatRoof(v, 0, 10.5, -2, 22, 18, 0xe6c992);
		dome(v, 0, 11.3, -3, 10, C.roofTeal);
		dome(v, -7.5, 11.3, -6, 5, C.gold);
		dome(v, 7.5, 11.3, -6, 5, C.gold);
		// Arches and awnings over the entrances
		for (const x of [-6, 0, 6]) {
			v.cbox(x, 0.5, 7.1, 3.6, 5, 0.4, 0x5a3420).cbox(x, 5.5, 7.1, 2.4, 1, 0.4, 0x5a3420);
			for (let i = 0; i < 3; i++) v.box(x - 2.4 + i * 1.6, 6.8, 7.2, 1.6, 0.5, 3, i % 2 ? C.white : [C.red, C.purple, C.blue][Math.abs(x) / 6]);
		}
		for (const [x, c] of [[-10, C.red], [10, C.purple]] as const) v.cbox(x, 0.5, 10, 4, 0.3, 5, c).cbox(x, 0.8, 10, 3, 0.2, 4, C.gold);
		crate(v, -3, 0.5, 11, 2.4);
		barrel(v, 3, 0.5, 11);
		return v;
	},
	imperialRoad: () => {
		const v = new Vox(155);
		v.cbox(0, 0.5, 0, 7, 0.4, 18, C.cobble);
		// A grand gate astride the road, a milestone, lanterns
		for (const x of [-6.5, 6.5]) walls(v, x, 0.5, 0, 6, 16, 7, C.white);
		v.cbox(0, 12, 0, 19, 5, 7, C.white).cbox(0, 17, 0, 20, 1, 8, shade(C.white, 0.9));
		v.cbox(0, 12, 3.6, 7, 0.8, 0.4, C.gold).cbox(0, 14, 3.6, 10, 2, 0.4, C.red).cbox(0, 14.6, 3.9, 4, 0.8, 0.3, C.gold);
		v.cbox(0, 18, 0, 6, 2, 3, C.gold).cbox(0, 20, 0, 3, 2, 2, C.gold);
		for (const x of [-6.5, 6.5]) flag(v, x, 17, 0, C.red, 6);
		v.cbox(6, 0.5, 9, 2, 4, 2, C.stone).cbox(6, 4.5, 9, 2.4, 0.6, 2.4, C.stoneDark).cbox(6, 2, 10.05, 1.2, 1, 0.2, C.gold);
		lantern(v, -5, 9);
		return v;
	},
	hallOfHeroes: () => {
		const v = new Vox(156);
		walls(v, 0, 2.5, -4, 20, 12, 14, C.white);
		v.cbox(0, 0.5, 0, 24, 2, 22, C.stone);
		gable(v, 0, 14.5, -4, 20, 14, C.roofRed, C.white, true);
		for (const x of [-8, -4, 4, 8]) column(v, x, 2.5, 4, 12, 0xfaf6ee);
		door(v, 0, 2.5, 3.1, 4, 7, 0x8a5a2b);
		// Red banners and heroes' statues
		for (const x of [-6, 6]) v.cbox(x, 6, 3.2, 2.4, 7, 0.3, C.red).cbox(x, 11, 3.4, 1, 1, 0.2, C.gold);
		statue(v, -8, 2.5, 9, 0xd9d4ca);
		statue(v, 8, 2.5, 9, 0xd9d4ca);
		stairs(v, 0, 11.5, 8, 3);
		return v;
	},
	observatory: () => {
		const v = new Vox(157);
		walls(v, 0, 0.5, 0, 14, 14, 14, C.stone);
		v.cbox(0, 14.5, 0, 16, 1, 16, C.stoneDark);
		// A white dome with its slot open, the telescope leaning out
		const top = dome(v, 0, 15.5, 0, 13, C.white);
		void top;
		v.cbox(0, 16, 4, 2.4, 8, 3, 0x2c3550);
		for (let i = 0; i < 6; i++) v.cbox(0, 19 + i * 1.2, 2.5 + i * 1.3, 2 - i * 0.12, 1.4, 1.6, i === 5 ? C.gold : C.steel);
		door(v, 0, 0.5, 7, 3, 5, 0x3a4a6a);
		windowZ(v, -4, 9, 7, 1.6, 2.4, C.glassWarm);
		windowZ(v, 4, 9, 7, 1.6, 2.4, C.glassWarm);
		for (const [x, z] of [[-9, 8], [8, -9], [9, 6]]) v.cbox(x, 0.5, z, 1, 1, 1, C.gold);
		return v;
	},
	councilHall: () => {
		const v = new Vox(158);
		walls(v, 0, 0.5, -2, 22, 11, 16, C.cream);
		flatRoof(v, 0, 11.5, -2, 22, 16, shade(C.cream, 0.94));
		for (const x of [-9, -6, -3, 3, 6, 9]) column(v, x, 0.5, 7, 11);
		v.cbox(0, 11.5, 7, 22, 1, 2, C.cream);
		dome(v, 0, 12.3, -2, 13, C.roofGreen);
		door(v, 0, 0.5, 6, 4, 6, 0x8a5a2b);
		// The flags of every civ
		for (const [x, c] of [[-10, C.red], [-6, C.blue], [-2, C.gold], [2, C.roofGreen], [6, C.purple], [10, C.roofOrange]] as const) flag(v, x, 0.5, 11.5, c, 7);
		return v;
	},
	grandExchange: () => {
		const v = new Vox(159);
		walls(v, 0, 0.5, -3, 22, 14, 16, C.white);
		flatRoof(v, 0, 14.5, -3, 22, 16, shade(C.white, 0.92));
		for (const x of [-9, -5.4, -1.8, 1.8, 5.4, 9]) column(v, x, 0.5, 6, 14);
		for (let i = 0; i < 4; i++) v.cbox(0, 14.5 + i, 6, 22 - i * 5, 1, 2, C.white);
		// A huge gold coin on top, gold bars by the steps
		v.cbox(0, 15.5, -3, 3, 2, 3, C.stoneDark).cbox(0, 17.5, -3, 10, 10, 1.6, C.gold).cbox(0, 19, -2.1, 7, 7, 0.4, shade(C.gold, 0.88)).cbox(0, 21.5, -1.8, 1.2, 2, 0.3, C.gold);
		stairs(v, 0, 12, 16, 2);
		for (const x of [-10, 10]) for (let i = 0; i < 3; i++) v.cbox(x, 0.5 + i * 0.9, 10, 4 - i, 0.9, 2, C.gold);
		return v;
	}
};

// ------------------------------------------------------------------
// Monuments (drawn 0.85 tiles wide, 1.15 high)
// ------------------------------------------------------------------

const monuments: Record<string, Builder> = {
	victoryArch: () => {
		const v = new Vox(170);
		for (const x of [-6, 6]) walls(v, x, 0.5, 0, 6, 16, 6, C.white);
		v.cbox(0, 13, 0, 18, 6, 6, C.white).cbox(0, 19, 0, 19, 1, 7, shade(C.white, 0.9));
		v.cbox(0, 15, 3.1, 8, 2, 0.4, C.gold).cbox(0, 20, 0, 6, 3, 3, C.gold).cbox(0, 23, 0, 2, 2, 2, C.gold);
		for (const x of [-6, 6]) v.cbox(x, 8, 3.1, 2, 3, 0.3, C.red);
		return v;
	},
	grandFountain: () => {
		const v = new Vox(171);
		v.cbox(0, 0.5, 0, 18, 2.5, 18, C.white).cbox(0, 2.7, 0, 16, 0.4, 16, C.water);
		v.cbox(0, 3, 0, 4, 6, 4, C.white).cbox(0, 9, 0, 10, 1.2, 10, C.white).cbox(0, 10.1, 0, 8.6, 0.3, 8.6, C.water);
		v.cbox(0, 10.2, 0, 2, 5, 2, C.white).cbox(0, 15.2, 0, 5, 1, 5, C.white).cbox(0, 16.2, 0, 1.4, 3, 1.4, 0xbfe8ff).cbox(0, 19.2, 0, 2.4, 1, 2.4, 0xdff4ff);
		for (const [x, z] of [[4.6, 0], [-4.6, 0], [0, 4.6], [0, -4.6]]) v.cbox(x, 3.1, z, 0.8, 6.2, 0.8, 0xbfe8ff);
		return v;
	},
	sageTower: () => {
		const v = new Vox(172);
		walls(v, 0, 0.5, 0, 9, 18, 9, C.stone);
		v.cbox(0, 18.5, 0, 11, 1, 11, C.stoneDark);
		windowZ(v, 0, 15, 4.5, 2, 2.6, C.purple);
		windowZ(v, 0, 8, 4.5, 1.6, 2, C.glassWarm);
		pyramid(v, 0, 19.5, 0, 9, C.purple, false);
		v.cbox(0, 25, 0, 1.6, 1.6, 1.6, C.cyan).cbox(0, 26.6, 0, 0.8, 1, 0.8, 0xffffff);
		door(v, 0, 0.5, 4.5, 3, 4.5, 0x5a3a7a);
		for (const [x, z] of [[-7, 6], [6, -7]]) v.cbox(x, 0.5, z, 1.2, 1.2, 1.2, C.purple);
		return v;
	},
	gildedVault: () => {
		const v = new Vox(173);
		walls(v, 0, 0.5, -1, 14, 10, 12, C.stoneDark);
		flatRoof(v, 0, 10.5, -1, 14, 12, C.stone);
		// A round gold vault door, coins spilling out
		v.cbox(0, 1.5, 5.1, 7, 7, 0.6, C.gold).cbox(0, 3, 5.6, 5, 4, 0.4, shade(C.gold, 0.85)).cbox(0, 4.5, 6, 3.4, 1, 0.3, C.steel).cbox(0, 3.3, 6, 1, 3.4, 0.3, C.steel);
		for (const [x, z] of [[-4, 7.5], [-2.5, 8.5], [3.5, 8], [4.8, 6.8], [1, 9]]) v.cbox(x, 0.5, z, 1.4, 0.5, 1.4, C.gold);
		v.cbox(-4.5, 0.5, 8, 2, 1.2, 2, C.gold);
		v.cbox(0, 11.5, -1, 3, 3, 3, C.gold);
		return v;
	},
	pathfinderCairn: () => {
		const v = new Vox(174);
		// A cairn of stacked stones, a flag, a compass rose at its foot
		for (const [y, w, c] of [[0.5, 10, C.stoneDark], [3.5, 8, C.stone], [6.5, 6.5, C.stoneDark], [9.3, 5, C.stone], [11.8, 3.6, C.stoneDark], [14, 2.4, C.stone]] as const) v.cbox(((y * 7) % 3) - 1, y, 0, w, 3, w * 0.9, c);
		flag(v, 0, 16, 0, C.roofGreen, 7);
		v.cbox(0, 0.6, 7, 6, 0.2, 1.2, C.gold).cbox(0, 0.6, 7, 1.2, 0.2, 6, C.gold).cbox(0, 0.7, 9.5, 0.8, 0.2, 1.4, C.red);
		pine(v, -7, -6, 0.8);
		return v;
	},
	marketCross: () => {
		const v = new Vox(175);
		v.cbox(0, 0.5, 0, 12, 1, 12, C.stone).cbox(0, 1.5, 0, 9, 1, 9, C.stone);
		for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) column(v, x, 2.5, z, 9, C.white);
		pyramid(v, 0, 11.5, 0, 9, C.roofRed, false);
		v.cbox(0, 16.5, 0, 1, 6, 1, C.gold).cbox(0, 20, 0, 4, 1, 1, C.gold);
		v.cbox(0, 2.5, 0, 2, 5, 2, C.stoneDark).cbox(0, 7.5, 0, 3, 1, 3, C.gold);
		return v;
	},
	artisansColumn: () => {
		const v = new Vox(176);
		v.cbox(0, 0.5, 0, 8, 2, 8, C.stone).cbox(0, 2.5, 0, 4, 16, 4, C.white).cbox(0, 18.5, 0, 6, 1.4, 6, C.stone);
		for (let y = 4; y < 18; y += 3) v.cbox(0, y, 0, 4.3, 0.4, 4.3, shade(C.white, 0.9));
		// A golden smith with his hammer raised
		statue(v, 0, 19.9, 0, C.gold, 0.8);
		v.cbox(1.2, 24.5, 0.6, 0.5, 3.6, 0.5, C.gold).cbox(1.2, 28, 0.6, 2, 1.4, 1.4, C.gold);
		return v;
	},
	peaceGarden: () => {
		const v = new Vox(177);
		// A little pagoda, blossom trees, a pond with a stepping-stone path, a white dove
		walls(v, -3, 0.5, -4, 8, 5, 8, 0xd9473f);
		for (const [y, w] of [[5.5, 11], [6.5, 9], [9, 8], [10, 6]] as const) v.cbox(-3, y, -4, w, 1, w, C.slate);
		v.cbox(-3, 6.5, -4, 6, 2.5, 6, 0xd9473f).cbox(-3, 11, -4, 0.8, 2, 0.8, C.gold);
		v.cbox(5, 0.4, 5, 8, 0.4, 7, C.water);
		for (const [x, z] of [[1, 3], [-1, 6], [1, 8.5]]) v.cbox(x, 0.6, z, 1.6, 0.3, 1.6, C.stone);
		tree(v, 7, -6, 0.9, C.pink);
		tree(v, -8, 7, 0.8, C.pink);
		v.cbox(5, 1, 5, 1.6, 0.8, 1, C.white).cbox(5.9, 1.4, 5, 0.8, 0.8, 0.8, C.white).cbox(6.4, 1.6, 5, 0.4, 0.3, 0.3, C.gold);
		return v;
	}
};

// ------------------------------------------------------------------
// Vehicles and siege (facing +Z; drawn about 46 wide, 40 high)
// ------------------------------------------------------------------

const vehicles: Record<string, Builder> = {
	catapult: () => {
		const v = new Vox(180);
		v.cbox(0, 1.6, 0, 7, 1.4, 12, C.plank).cbox(-3.2, 1.6, 0, 0.8, 1.6, 12, C.plankDark).cbox(3.2, 1.6, 0, 0.8, 1.6, 12, C.plankDark);
		for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) wheel(v, x, 2.2, z, 2.2);
		v.cbox(0, 3, 1, 7, 5, 1, C.plankDark).cbox(0, 8, 1, 7.6, 1, 1.6, C.plank);
		// The arm, cocked back, a stone in its cup
		for (let i = 0; i < 6; i++) v.cbox(0, 3.5 + i * 1.1, -1.5 - i * 0.9, 1, 1.2, 1.4, C.plank);
		v.cbox(0, 9.6, -7, 3, 1, 3, C.plankDark).cbox(0, 10.6, -7, 2.2, 1.8, 2.2, C.stoneDark);
		return v;
	},
	trebuchet: () => {
		const v = new Vox(181);
		v.cbox(0, 0.5, 0, 9, 1.4, 12, C.plankDark);
		for (const x of [-3.5, 3.5]) {
			for (let i = 0; i < 10; i++) v.cbox(x, 1.9 + i * 1.2, -4 + i * 0.4, 1, 1.2, 1, C.plank).cbox(x, 1.9 + i * 1.2, 4 - i * 0.4, 1, 1.2, 1, C.plank);
		}
		v.cbox(0, 14, 0, 8.4, 1, 1, C.dark);
		// The long beam with its counterweight
		for (let i = -5; i <= 9; i++) v.cbox(0, 14 + i * 0.55, i * 0.9, 1, 1.2, 1, C.plank);
		v.cbox(0, 8.5, -5, 4, 4, 4, C.plankDark).cbox(0, 9.5, -5, 4.2, 0.6, 4.2, C.steel);
		v.cbox(0, 18.5, 8.6, 0.3, 4, 0.3, C.dark).cbox(0, 17.5, 8.6, 1.6, 1.2, 1.6, C.stoneDark);
		return v;
	},
	cannon: () => {
		const v = new Vox(182);
		v.cbox(0, 1.6, -1.5, 4, 2.4, 10, C.plank).cbox(0, 0.5, -6, 2.4, 1.6, 3, C.plankDark);
		wheel(v, -3, 3.2, 1.5, 3.2, C.plankDark);
		wheel(v, 3, 3.2, 1.5, 3.2, C.plankDark);
		v.cbox(0, 4, 0, 1.6, 1.6, 1.6, C.steel);
		// The barrel, tipped up a little, a dark muzzle at the front
		for (let i = 0; i < 6; i++) v.cbox(0, 4.4 + i * 0.35, 0.5 + i * 1.6, 3 - i * 0.15, 3 - i * 0.15, 1.7, 0x41444c);
		v.cbox(0, 6.4, 10, 3.2, 3.2, 0.6, 0x2a2c31).cbox(0, 7.2, 10.3, 1.4, 1.4, 0.3, 0x111214);
		v.cbox(0, 4.2, -2, 2.6, 2.6, 1.2, 0x41444c).cbox(0, 4.7, -2.8, 1, 1, 0.8, 0x2a2c31);
		for (const x of [-1.6, 0, 1.6]) v.cbox(x - 4, 0.5, -5, 1.4, 1.4, 1.4, 0x2a2c31);
		return v;
	},
	artillery: () => {
		const v = new Vox(183);
		const OLIVE = 0x6f7a4d, DARK = 0x4d5536;
		// A sturdy field gun: a short trail, a broad steel shield, big chunky wheels, a long barrel
		v.cbox(0, 0.5, -5.5, 3.2, 2, 7, OLIVE).cbox(0, 0.5, -9, 5, 1.6, 1.8, DARK);
		v.cbox(0, 2.5, 0, 6.4, 3.4, 6, OLIVE).cbox(0, 5.9, -0.5, 4.4, 2.2, 4, DARK);
		for (const x of [-4.6, 4.6]) {
			v.cbox(x, 0, 0.5, 1.8, 8, 4.4, 0x3d3f45).cbox(x, 1.8, 0.5, 1.8, 4.4, 8, 0x3d3f45).cbox(x, 0.7, 0.5, 1.8, 6.6, 6.6, 0x3d3f45);
			v.cbox(x, 2.9, 0.5, 2.2, 2.2, 2.2, C.steel);
		}
		v.cbox(0, 3, 3.6, 10.4, 7.4, 1, C.steel).cbox(0, 10.4, 3.6, 8, 0.8, 1, shade(C.steel, 0.9)).cbox(0, 5.6, 4.15, 2.6, 2.6, 0.2, 0x2a2c31);
		for (let i = 0; i < 7; i++) v.cbox(0, 6 + i * 0.3, 4 + i * 1.4, 2.2, 2.2, 1.5, i % 3 ? DARK : OLIVE);
		v.cbox(0, 7.8, 14, 3, 3, 1, 0x2a2c31).cbox(0, 8.6, 14.6, 1.2, 1.2, 0.5, 0x111214);
		return v;
	},
	rocketArtillery: () => {
		const v = new Vox(184);
		const OLIVE = 0x6f7a4d;
		// A little truck with a rack of rockets
		v.cbox(0, 2.2, 0, 7, 2, 16, OLIVE).cbox(0, 4.2, 5.5, 6.4, 4.4, 5, OLIVE).cbox(0, 6.2, 8.05, 5, 2, 0.3, C.glass);
		for (const [x, z] of [[-3.4, 5], [3.4, 5], [-3.4, -4], [3.4, -4]]) wheel(v, x, 2.4, z, 2.2, 0x2a2c31);
		v.cbox(0, 4.2, -3, 6.4, 1.6, 7, 0x4d5536);
		for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
			const x = -2.4 + c * 1.6, y = 5.8 + r * 1.6;
			for (let i = 0; i < 4; i++) v.cbox(x, y + i * 0.5, -6 + i * 1.6, 1.2, 1.2, 1.7, 0x3d4047);
			v.cbox(x, y + 2.1, 0.8, 1.2, 1.2, 0.8, C.red);
		}
		return v;
	},
	railgun: () => {
		const v = new Vox(185);
		// A hovering platform with two glowing rails
		v.cbox(0, 1, 0, 9, 1, 10, 0x2a3a50).cbox(0, 0.4, 0, 7, 0.6, 8, C.cyan);
		v.cbox(0, 2, -1, 8, 3, 9, 0xdfe6ee).cbox(0, 5, -2, 5, 2.4, 5, 0xc4ced9);
		for (const x of [-1.5, 1.5]) v.cbox(x, 5.5, 6, 1, 1.4, 16, 0x56637a).cbox(x, 6.9, 6, 0.5, 0.4, 15, C.cyan);
		v.cbox(0, 5.5, 14.2, 4, 1.4, 0.6, C.cyan);
		return v;
	},
	tank: () => {
		const v = new Vox(186);
		const OLIVE = 0x6f8a4d;
		// Chunky treads, a rounded hull, a turret with a stubby gun
		for (const x of [-4, 4]) {
			v.cbox(x, 0.5, 0, 3, 3.6, 15, 0x3d3f45);
			for (let z = -6; z <= 6; z += 3) v.cbox(x + Math.sign(x) * 1.55, 1.2, z, 0.2, 2.2, 2.2, 0x6b6e75);
		}
		v.cbox(0, 3, 0, 8, 3, 14, OLIVE).cbox(0, 6, -1, 6.4, 0.6, 9, shade(OLIVE, 0.92));
		v.cbox(0, 6.6, -1.5, 6, 3.4, 6, OLIVE).cbox(0, 10, -1.5, 3, 1, 3, shade(OLIVE, 0.9));
		v.cbox(0, 7.6, 6, 1.6, 1.6, 9, 0x4d5536).cbox(0, 7.3, 10.6, 2.2, 2.2, 1.4, 0x3a4029);
		v.cbox(-1.8, 8.4, 1.55, 1, 1, 0.2, 0x2a2230).cbox(1.8, 8.4, 1.55, 1, 1, 0.2, 0x2a2230);
		v.cbox(2.2, 3.5, 7.05, 1.8, 1.8, 0.2, C.white).cbox(2.2, 4, 7.15, 0.8, 0.8, 0.1, C.red);
		return v;
	},
	hoverTank: () => {
		const v = new Vox(187);
		// A sleek hover hull with a glow beneath
		v.cbox(0, 0.6, 0, 9, 0.6, 13, C.cyan);
		v.cbox(0, 1.6, 0, 10, 3, 14, 0xe5ebf2).cbox(0, 1.6, 7.2, 8, 2, 1, 0xc4ced9).cbox(0, 4.6, -1, 8, 0.8, 11, 0xc4ced9);
		v.cbox(0, 5.4, -1.5, 6, 3, 6, 0x56637a).cbox(0, 6.2, 1.6, 4, 1, 0.4, C.cyan);
		v.cbox(0, 6.4, 6, 1.4, 1.4, 9, 0x3d4a5e).cbox(0, 6.6, 10.6, 1, 1, 0.6, C.cyan);
		for (const x of [-5.2, 5.2]) v.cbox(x, 2, -2, 0.6, 1.4, 6, C.cyan);
		return v;
	},
	boat: () => {
		const v = new Vox(188);
		// Hull along z (bow forward): the deck at about 4.3, the mast and sail aft so the bow is free to stand in
		for (let i = 0; i < 4; i++) {
			const len = 28 - (3 - i) * 2.4;
			const w = 9 - (3 - i) * 1.4;
			v.cbox(0, i * 1.1, -0.6 + (3 - i) * 0.4, w, 1.1, len, i % 2 ? C.plank : shade(C.plank, 0.92));
		}
		// The bow, narrowing to a point
		for (let i = 0; i < 4; i++) v.cbox(0, 1.1 + i * 0.8, 13.3 + i * 0.5, 6 - i * 1.4, 3.2, 1.2, C.plankDark);
		v.cbox(0, 4.3, 0, 7.4, 0.3, 24, shade(C.plank, 1.1));
		v.cbox(0, 4.4, -13.5, 7, 2.4, 0.8, C.plankDark).cbox(0, 0.5, -14.4, 0.8, 4, 1, C.plankDark);
		v.cbox(-3.9, 4.3, 0, 0.6, 1.2, 24, C.plankDark).cbox(3.9, 4.3, 0, 0.6, 1.2, 24, C.plankDark);
		// Mast and a square striped sail
		v.cbox(0, 4.4, -4, 1, 17, 1, C.log);
		v.cbox(0, 8, -3.2, 12, 9, 0.5, C.white);
		for (const y of [10, 13.5]) v.cbox(0, y, -2.95, 12, 1.4, 0.2, C.red);
		v.cbox(0, 17.2, -3.4, 13, 0.6, 0.6, C.log).cbox(0, 7.6, -3.4, 13, 0.6, 0.6, C.log);
		flag(v, 0, 21, -4, C.red, 2.4);
		barrel(v, 2, 4.6, -9, 2.6);
		crate(v, -2, 4.6, -9.5, 2.4);
		return v;
	}
};

/** City walls, put together round a walled city: a straight stretch (along x, outside to +Z) and a corner tower. */
const fortifications: Record<string, Builder> = {
	wallSegment: () => {
		const v = new Vox(190);
		const len = 24;
		// Courses of stone on a darker footing, a walkway and merlons on top
		v.cbox(0, 0, 0, len, 1.4, 3.6, C.stoneDark);
		for (let r = 0; r < 4; r++) v.cbox(0, 1.4 + r * 1.4, 0, len, 1.4, 3, r % 2 ? C.stone : shade(C.stone, 0.92));
		for (let r = 0; r < 4; r++) {
			for (let x = -len / 2 + (r % 2 ? 1.6 : 3.2); x < len / 2 - 0.4; x += 3.2) v.cbox(x, 1.5 + r * 1.4, 1.55, 0.25, 1.2, 0.1, C.stoneDark);
		}
		v.cbox(0, 7, 0, len, 0.6, 3.6, shade(C.stone, 1.06));
		for (let x = -len / 2 + 0.9; x < len / 2; x += 3.2) v.cbox(x, 7.6, 1.3, 1.8, 1.6, 1, C.stone).cbox(x, 7.6, -1.3, 1.8, 1.6, 1, shade(C.stone, 0.95));
		return v;
	},
	wallTower: () => {
		const v = new Vox(191);
		v.cbox(0, 0, 0, 6.4, 1.4, 6.4, C.stoneDark);
		for (let r = 0; r < 7; r++) v.cbox(0, 1.4 + r * 1.4, 0, 5.6, 1.4, 5.6, r % 2 ? C.stone : shade(C.stone, 0.92));
		// A slit window, a jutting top and battlements
		v.cbox(0, 6, 2.85, 0.8, 2.2, 0.1, C.dark).cbox(0, 6, -2.85, 0.8, 2.2, 0.1, C.dark);
		v.cbox(0, 11.2, 0, 7, 0.8, 7, shade(C.stone, 1.06));
		for (const [x, z] of [[-2.9, -2.9], [0, -2.9], [2.9, -2.9], [-2.9, 0], [2.9, 0], [-2.9, 2.9], [0, 2.9], [2.9, 2.9]] as const) v.cbox(x, 12, z, 1.2, 1.6, 1.2, C.stone);
		return v;
	}
};

export const PROPS: Record<string, Builder> = { ...buildings, ...cities, ...wonders, ...monuments, ...vehicles, ...fortifications, millBody, millSails };
