import { type Bone, type Clip, type Pose, Vox } from "./mesh";
import { shade } from "./parts";

/**
 * Blocky characters: cute, big-headed (the head is wider than the body),
 * with dot eyes and rosy cheeks. Each one is rigged to seven bones (root,
 * body, head, arms, legs) and has idle, walk, attack, hit and death clips,
 * and workers a "work" clip (a two-handed tool swing). Riders sit on a
 * pony rigged the same way.
 */

export interface Rigged {
	vox: Vox;
	bones: Bone[];
	clips: Clip[];
}

// Bones
const ROOT = 0, BODY = 1, HEAD = 2, ARM_L = 3, ARM_R = 4, LEG_L = 5, LEG_R = 6;

type Build = "villager" | "soldier" | "slim" | "heavy";

/**
 * Body shapes. Villagers are the cutest (the head as wide as the whole body); soldiers stand taller
 * with smaller heads so their armour and kit show; heavies are broad; archers and the like slim.
 * `kit` scales what they hold.
 */
interface Frame { legH: number; legW: number; bodyW: number; bodyH: number; bodyD: number; armW: number; armL: number; head: number; kit: number }
const FRAMES: Record<Build, Frame> = {
	villager: { legH: 5, legW: 2.8, bodyW: 7, bodyH: 6, bodyD: 4, armW: 2, armL: 6, head: 1, kit: 1 },
	soldier: { legH: 6, legW: 3, bodyW: 8, bodyH: 7.5, bodyD: 5, armW: 2.4, armL: 7.5, head: 0.86, kit: 1.25 },
	slim: { legH: 6.4, legW: 2.6, bodyW: 7, bodyH: 7.4, bodyD: 4.2, armW: 2.1, armL: 7.4, head: 0.86, kit: 1.25 },
	heavy: { legH: 6, legW: 3.5, bodyW: 9.8, bodyH: 8, bodyD: 6, armW: 3, armL: 8, head: 0.82, kit: 1.35 }
};

function bonesFor (f: Frame): Bone[] {
	const hip = f.legH, neck = f.legH + f.bodyH, armX = f.bodyW / 2 + f.armW / 2;
	return [
		{ name: "root", parent: -1, pivot: [0, hip, 0] },
		{ name: "body", parent: ROOT, pivot: [0, hip, 0] },
		{ name: "head", parent: BODY, pivot: [0, neck, 0] },
		{ name: "armL", parent: BODY, pivot: [armX, neck - 0.5, 0] },
		{ name: "armR", parent: BODY, pivot: [-armX, neck - 0.5, 0] },
		{ name: "legL", parent: ROOT, pivot: [f.legW / 2 + 0.15, hip, 0] },
		{ name: "legR", parent: ROOT, pivot: [-(f.legW / 2 + 0.15), hip, 0] }
	];
}

// Colours
export const SKIN = { light: 0xf9d6bd, tan: 0xe8b48d, brown: 0xb98057, dark: 0x83573a };
export const HAIR = { brown: 0x6b4426, black: 0x2e2522, blonde: 0xf0c75e, ginger: 0xd0662f, grey: 0xc9c4bd };
const EYE = 0x2a2230, CHEEK = 0xff9aa2, WHITE = 0xffffff, MOUTH = 0x9a4a4a;
const WOOD = 0x9b6a3c, DARKWOOD = 0x6e4724, IRON = 0xc7ced6, STEEL = 0x8e99a6, GOLD = 0xf2c447, LEATHER = 0x8a5a33;

type HairStyle = "short" | "long" | "spiky" | "bun" | "bald";
type Weapon = "club" | "sword" | "spear" | "axe" | "pickaxe" | "hammer" | "hoe" | "rod" | "staff" | "musket" | "rifle" | "mg" | "laser" | "crossbow" | "lance" | "saber";
type Attack = "swing" | "bow" | "fire" | "thrust";

export interface ChibiSpec {
	build?: Build;
	skin: number;
	hair?: number;
	hairStyle?: HairStyle;
	shirt: number;
	/** The arms' colour (the shirt's unless given; skin for bare arms). */
	sleeves?: number;
	pants: number;
	shoes?: number;
	belt?: number;
	/** A long coat's tails over the legs. */
	coatTails?: number;
	/** Shoulder armour. */
	pauldrons?: number;
	/** War paint on the cheeks. */
	paint?: number;
	/** Drawn on the head (which spans x -5..5, y 11..20, z -4.5..4.5 before it is fitted to the body). */
	hat?: (v: Vox) => void;
	/** Drawn on the body (spanning x -3.5..3.5, y 5..11, z -2..2 before it is fitted). */
	outfit?: (v: Vox) => void;
	weapon?: Weapon;
	offhand?: "shield" | "buckler" | "tower" | "bow";
	shieldColor?: number;
	shieldEmblem?: number;
	back?: "quiver" | "pack" | "sack" | "jetpack" | "cape" | "cloakQuiver";
	backColor?: number;
	attack?: Attack;
	worker?: boolean;
	/** Chunky armour: a broad shoulder block. */
	bulky?: boolean;
	seed?: number;
}

// ------------------------------------------------------------------
// The figure
// ------------------------------------------------------------------

function face (v: Vox): void {
	for (const s of [-1, 1]) {
		v.box(s * 2.1 - 0.7, 14, 4.5, 1.4, 2, 0.3, EYE);
		v.box(s * 2.1 - 0.7 + (s < 0 ? 0.75 : 0.05), 15.3, 4.8, 0.55, 0.55, 0.1, WHITE);
		v.box(s * 3.6 - 0.8, 13.1, 4.5, 1.6, 0.8, 0.2, CHEEK);
	}
	v.box(-0.6, 12.7, 4.5, 1.2, 0.45, 0.15, MOUTH);
}

function hair (v: Vox, style: HairStyle, c: number): void {
	if (style === "bald") return;
	v.box(-5.3, 18.6, -4.8, 10.6, style === "spiky" ? 2.4 : 2.6, 9.6, c);
	v.box(-5.3, style === "long" ? 10.5 : 13.5, -4.85, 10.6, style === "long" ? 8.1 : 5.1, 1.2, c);
	for (const s of [-1, 1]) v.box(s > 0 ? 4.9 : -5.3, style === "long" ? 11 : 15.5, -4.8, 0.4, style === "long" ? 7.6 : 3.1, style === "long" ? 8.4 : 7.8, c);
	// A fringe in three chunks
	v.box(-5.3, 18, 4.45, 3.4, 1.6, 0.5, c).box(-1.6, 17.6, 4.45, 3.4, 2, 0.5, c).box(2.1, 18.2, 4.45, 3.2, 1.4, 0.5, c);
	if (style === "spiky") {
		v.box(-3.5, 21, -2, 2, 1.6, 2, c).box(0, 21, -1, 2, 2.2, 2, c).box(2.5, 21, -3, 1.8, 1.4, 1.8, c).box(-1.5, 21, 1.5, 1.6, 1.2, 1.6, c);
	}
	if (style === "bun") v.cbox(0, 20.5, -3, 3.4, 3, 3.4, c);
}

function weaponBoxes (v: Vox, w: Weapon, c?: number): void {
	// Held upright in the right hand, just outside the head's width so they show from above
	const x = -5.9, z = 1.2;
	switch (w) {
		case "club":
			v.cbox(x, 3, z, 1.3, 9, 1.3, 0xc8955a).cbox(x, 11, z, 3, 4.6, 3, 0xb07a44).cbox(x, 12.4, z, 3.3, 0.7, 3.3, 0x7a4f2c);
			break;
		case "sword":
			v.cbox(x, 3.4, z, 1.1, 2.4, 1.1, LEATHER).cbox(x, 5.8, z, 1.2, 0.9, 3.6, GOLD).cbox(x, 6.7, z, 0.7, 11, 1.6, IRON).cbox(x, 17.7, z, 0.7, 1.2, 0.9, IRON);
			break;
		case "saber":
			v.cbox(x, 3.4, z, 1.1, 2.2, 1.1, LEATHER).cbox(x, 5.6, z, 1.1, 0.8, 3, GOLD).cbox(x, 6.4, z, 0.6, 10, 1.3, IRON).cbox(x, 16.4, z + 0.5, 0.6, 1.2, 0.9, IRON);
			break;
		case "spear":
			v.cbox(x, 1, z, 0.9, 21, 0.9, WOOD).cbox(x, 22, z, 0.7, 3.4, 1.8, IRON).cbox(x, 25.4, z, 0.7, 1, 0.8, IRON).cbox(x, 20.6, z, 1.2, 0.8, 1.2, 0xd94a4a);
			break;
		case "lance":
			v.cbox(x, 3, z, 1.6, 2.4, 1.6, c ?? 0xd94a4a).cbox(x, 5.4, z, 1, 19, 1, c ?? 0xf3efe6).cbox(x, 24.4, z, 0.7, 3, 0.7, IRON);
			break;
		case "axe":
			v.cbox(x, 3, z, 1.1, 11, 1.1, WOOD).box(x - 0.5, 10.5, z + 0.5, 1, 3.6, 3.6, IRON).box(x - 0.5, 11, z + 4, 1, 2.6, 0.7, 0xe9eef3);
			break;
		case "pickaxe":
			v.cbox(x, 3, z, 1.1, 11, 1.1, WOOD).cbox(x, 13, z + 0.5, 1, 1.4, 9, STEEL);
			break;
		case "hammer":
			v.cbox(x, 3, z, 1.1, 9, 1.1, WOOD).cbox(x, 11.5, z + 0.5, 2.8, 2.8, 4.4, STEEL);
			break;
		case "hoe":
			v.cbox(x, 2, z, 0.9, 14, 0.9, WOOD).cbox(x, 15, z + 1.6, 0.7, 1.2, 3.4, STEEL);
			break;
		case "rod":
			v.cbox(x, 3, z, 0.8, 7, 0.8, DARKWOOD).cbox(x, 10, z, 0.5, 12, 0.5, WOOD).cbox(x, 7, z + 0.9, 1.2, 1.2, 1.2, 0xe23b3b);
			break;
		case "staff":
			v.cbox(x, 1, z, 1, 16, 1, WOOD).cbox(x, 17, z, 1.8, 1.8, 1.8, DARKWOOD);
			break;
		case "musket":
			v.cbox(x, 2.5, z, 1.4, 4.5, 1.6, WOOD).cbox(x, 7, z, 0.9, 13, 0.9, 0x3c3c44).cbox(x, 7, z + 0.7, 1, 7, 0.5, WOOD);
			break;
		case "rifle":
			v.cbox(x, 3, z, 1.4, 4, 1.8, 0x7a5232).cbox(x, 7, z, 1, 10, 1.1, 0x34363d).cbox(x, 7.5, z + 1, 0.8, 2.4, 1.1, 0x34363d).cbox(x, 17, z, 0.4, 3, 0.7, IRON);
			break;
		case "mg":
			v.cbox(x, 3, z + 0.5, 2.4, 9.5, 2.8, 0x3d4047).cbox(x, 12.5, z + 0.5, 1.1, 5, 1.1, 0x2a2c31).cbox(x - 0.2, 5, z + 2.6, 1.8, 2.8, 2.2, 0x5b6068);
			break;
		case "laser":
			v.cbox(x, 3, z, 2, 8, 2.2, 0xeef2f7).cbox(x, 11, z, 1.1, 4, 1.1, 0x9aa7b8).cbox(x, 15, z, 1.4, 1.4, 1.4, 0x4ef0ff).cbox(x, 5.5, z + 1.3, 0.6, 3.4, 0.6, 0x4ef0ff);
			break;
		case "crossbow":
			v.cbox(x, 3, z, 1.3, 10, 1.5, WOOD).cbox(x, 11.5, z, 7, 1.1, 1.1, DARKWOOD).cbox(x, 11.7, z - 0.7, 7, 0.3, 0.2, WHITE);
			break;
	}
}

function chibi (spec: ChibiSpec): Rigged {
	const f = FRAMES[spec.build ?? "villager"];
	const v = new Vox(spec.seed ?? 7);
	const hip = f.legH, neck = f.legH + f.bodyH, armX = f.bodyW / 2 + f.armW / 2;
	const shoes = spec.shoes ?? 0x5a3b28;
	const legD = Math.min(f.bodyD - 0.6, f.legW + 0.4);
	// Legs
	for (const [bone, s] of [[LEG_L, 1], [LEG_R, -1]] as const) {
		v.on(bone, () => {
			const x0 = s > 0 ? 0.25 : -0.25 - f.legW;
			v.box(x0, 1.2, -legD / 2, f.legW, hip - 1.2, legD, spec.pants);
			v.box(x0 - 0.1, 0, -legD / 2 - 0.1, f.legW + 0.2, 1.4, legD + 0.7, shoes);
		});
	}
	// The body, its details drawn on the standard body (x -3.5..3.5, y 5..11, z -2..2) and fitted to this one
	v.on(BODY, () => {
		v.box(-f.bodyW / 2, hip, -f.bodyD / 2, f.bodyW, f.bodyH, f.bodyD, spec.shirt);
		const d = new Vox();
		if (spec.belt !== undefined) d.box(-3.6, 6, -2.1, 7.2, 0.9, 4.2, spec.belt).box(-0.7, 5.9, 2.05, 1.4, 1.1, 0.2, GOLD);
		if (spec.coatTails !== undefined) d.box(-3.6, 3, -2.15, 7.2, 2.4, 1.4, spec.coatTails).box(-3.6, 3, 0.75, 1.3, 2.4, 1.4, spec.coatTails).box(2.3, 3, 0.75, 1.3, 2.4, 1.4, spec.coatTails);
		if (spec.bulky) d.box(-5, 9, -2.4, 10, 2.4, 4.8, spec.pauldrons ?? spec.shirt);
		spec.outfit?.(d);
		const bc = spec.backColor;
		switch (spec.back) {
			case "quiver":
				d.box(-1.6, 6, -3.6, 2.4, 6, 1.6, LEATHER).box(-1.3, 12, -3.3, 0.5, 1.4, 0.5, WHITE).box(-0.5, 12, -3.4, 0.5, 1.8, 0.5, WHITE).box(0.2, 12, -3.2, 0.5, 1.2, 0.5, WHITE);
				break;
			case "cloakQuiver":
				d.box(-3.8, 3.4, -2.7, 7.6, 7.8, 0.7, bc ?? 0x3f7d3c);
				d.box(-1.4, 6.5, -4.2, 2.4, 6, 1.6, LEATHER).box(-1.1, 12.5, -3.9, 0.5, 1.6, 0.5, WHITE).box(-0.3, 12.5, -4, 0.5, 2, 0.5, 0xd94a4a).box(0.4, 12.5, -3.8, 0.5, 1.4, 0.5, WHITE);
				break;
			case "pack":
				d.box(-3, 5.5, -5, 6, 5.5, 3, bc ?? 0x9a7b4f).box(-3.4, 11, -5.4, 6.8, 1.8, 2.2, 0x7d9cc4).box(-2.2, 7, -5.3, 4.4, 0.8, 0.3, LEATHER);
				break;
			case "sack":
				d.box(-3, 5.5, -5.4, 6, 6.5, 3.4, bc ?? 0xe6d3a8).cbox(0, 12, -3.7, 2, 0.8, 2, 0xb99a62);
				break;
			case "jetpack":
				d.box(-3, 6, -4, 2.4, 5, 2, bc ?? 0xb8c2cc).box(0.6, 6, -4, 2.4, 5, 2, bc ?? 0xb8c2cc).box(-2.6, 5, -3.8, 1.6, 1, 1.6, 0xff9d3c).box(1, 5, -3.8, 1.6, 1, 1.6, 0xff9d3c);
				break;
			case "cape":
				d.box(-3.8, 3.5, -2.6, 7.6, 7.5, 0.6, bc ?? 0xc0392b);
				break;
		}
		const sx = f.bodyW / 7, sy = f.bodyH / 6, sz = f.bodyD / 4;
		v.add(d, 0, hip - 5 * sy, 0, 0, sx, sy, sz);
	});
	// Arms (hands are skin at the bottom)
	for (const [bone, s] of [[ARM_L, 1], [ARM_R, -1]] as const) {
		v.on(bone, () => {
			const x0 = s > 0 ? f.bodyW / 2 : -f.bodyW / 2 - f.armW;
			const bottom = neck - f.armL;
			v.box(x0, bottom + 1.5, -f.armW / 2, f.armW, f.armL - 1.5, f.armW, spec.sleeves ?? spec.shirt);
			v.box(x0 + 0.1, bottom, -f.armW / 2 + 0.1, f.armW - 0.2, 1.5, f.armW - 0.2, spec.skin);
			if (spec.pauldrons !== undefined) v.box(x0 - 0.55, neck - 2.4, -f.armW / 2 - 0.55, f.armW + 1.1, 2.6, f.armW + 1.1, spec.pauldrons);
		});
	}
	// The head, drawn at the standard size and fitted onto the neck
	v.on(HEAD, () => {
		const h = new Vox();
		h.box(-5, 11, -4.5, 10, 9, 9, spec.skin);
		face(h);
		if (spec.paint !== undefined) for (const x of [-4.4, 2.8]) h.box(x, 13.9, 4.5, 1.6, 0.45, 0.3, spec.paint).box(x, 12.9, 4.5, 1.6, 0.45, 0.3, spec.paint);
		hair(h, spec.hairStyle ?? "short", spec.hair ?? HAIR.brown);
		spec.hat?.(h);
		v.add(h, 0, neck - 11 * f.head, 0, 0, f.head);
	});
	// What they carry: the weapon in the right hand, a shield or bow in the left
	const handY = neck - f.armL + 0.5, k = f.kit;
	if (spec.weapon) {
		v.on(ARM_R, () => {
			const w = new Vox();
			weaponBoxes(w, spec.weapon as Weapon);
			v.add(w, -(armX + f.armW / 2 + 0.4) + 5.9 * k, handY - 5.5 * k, 0, 0, k);
		});
	}
	v.on(ARM_L, () => offhand(v, spec, f, armX, handY));
	return { vox: v, bones: bonesFor(f), clips: chibiClips(spec) };
}

function offhand (v: Vox, spec: ChibiSpec, f: Frame, armX: number, handY: number): void {
	const sc = spec.shieldColor ?? 0xc0392b, em = spec.shieldEmblem ?? GOLD, k = f.kit;
	const front = f.armW / 2;
	switch (spec.offhand) {
		case "shield": {
			// A big shield before the left arm: two crossed slabs make its rounded corners, a rim, a boss
			const r = 3.8 * k, cx = armX - 0.6, y0 = handY - 1;
			v.cbox(cx, y0, front + 0.9, 2 * r - 2, 2 * r, 1, sc).cbox(cx, y0 + 1, front + 0.9, 2 * r, 2 * r - 2, 1, sc);
			v.cbox(cx, y0 + 0.4, front + 1.5, 2 * r - 2.6, 0.8, 0.4, shade(sc, 0.75)).cbox(cx, y0 + 2 * r - 1.2, front + 1.5, 2 * r - 2.6, 0.8, 0.4, shade(sc, 0.75));
			v.cbox(cx, y0 + r - 1.3, front + 1.5, 2.6, 2.6, 0.6, em).cbox(cx, y0 + 1.2, front + 1.5, 0.9, 2 * r - 2.4, 0.3, em).cbox(cx, y0 + r - 0.45, front + 1.5, 2 * r - 2.4, 0.9, 0.3, em);
			break;
		}
		case "buckler": {
			const r = 2.7 * k, cx = armX - 0.3, y0 = handY - 0.6;
			v.cbox(cx, y0, front + 0.8, 2 * r - 1.6, 2 * r, 0.9, sc).cbox(cx, y0 + 0.8, front + 0.8, 2 * r, 2 * r - 1.6, 0.9, sc);
			v.cbox(cx, y0 + r - 1, front + 1.3, 2, 2, 0.6, em);
			break;
		}
		case "tower": {
			// A tall shield held squarely before the whole body
			const w = f.bodyW + 3.4, cx = armX - f.bodyW / 2 - 0.6, z = f.bodyD / 2 + 0.9 - 0.3;
			const y0 = 1.2, h = f.legH + f.bodyH + 0.6;
			v.cbox(cx, y0, z, w, h, 1.2, sc).cbox(cx, y0 - 0.3, z - 0.2, w + 0.6, 0.8, 1.6, em).cbox(cx, y0 + h - 0.5, z - 0.2, w + 0.6, 0.8, 1.6, em);
			v.cbox(cx, y0 + 1, z + 0.6, 1.4, h - 2, 0.4, em).cbox(cx, y0 + h * 0.58, z + 0.6, w - 2, 1.4, 0.4, em);
			break;
		}
		case "bow": {
			// A tall bow in the left hand, its tips curling forward, the string behind
			const x = armX + f.armW / 2 + 0.4, mid = handY + 1, len = 8 * k;
			v.box(x - 0.5, mid - len, front + 1.6, 1.1, 2 * len, 0.9, WOOD);
			v.box(x - 0.5, mid - len - 1, front + 0.6, 1.1, 1.4, 1.4, WOOD).box(x - 0.5, mid + len - 0.4, front + 0.6, 1.1, 1.4, 1.4, WOOD);
			v.box(x - 0.6, mid - 1, front + 1.4, 1.3, 2.4, 1.3, LEATHER);
			v.box(x - 0.1, mid - len - 0.6, front + 0.45, 0.25, 2 * len + 1.2, 0.2, WHITE);
			break;
		}
	}
}

// ------------------------------------------------------------------
// Clips
// ------------------------------------------------------------------

const TAU = Math.PI * 2;
const ease = (k: number) => k * k * (3 - 2 * k);
/** 0 -> 1 -> 0 over [a, b] (a smooth bump). */
const bump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));
/** Piecewise-linear keys [time, value] with easing between. */
function keys (t: number, ks: [number, number][]): number {
	if (t <= ks[0][0]) return ks[0][1];
	for (let i = 1; i < ks.length; i++) {
		if (t <= ks[i][0]) {
			const [t0, v0] = ks[i - 1], [t1, v1] = ks[i];
			return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
		}
	}
	return ks[ks.length - 1][1];
}

type Rot = [number, number, number];

/** How a fighter holds their kit at rest: weapons raised forward, shields up, bows held out, guns shouldered. */
function stanceOf (spec: ChibiSpec): Record<string, Rot> {
	if (spec.worker || (!spec.weapon && !spec.offhand)) return {};
	if ((spec.build ?? "villager") === "villager") return { armR: [-0.2, 0, 0] };
	const s: Record<string, Rot> = {};
	switch (spec.attack ?? "swing") {
		case "swing": s.armR = [-0.65, 0, -0.12]; break;
		case "thrust": s.armR = [-0.3, 0, -0.05]; break;
		case "fire": s.armR = [-0.95, 0, 0]; s.armL = [-0.75, 0, -0.45]; break;
		case "bow": s.armL = [-1.1, 0, 0.05]; s.armR = [-0.5, 0, -0.1]; break;
	}
	if (spec.offhand === "shield" || spec.offhand === "buckler") s.armL = [-0.55, 0, 0.12];
	if (spec.offhand === "tower") s.armL = [-0.1, 0, 0];
	return s;
}

/** A pose with the stance added to it (scaled by `weight`, 1 by default). */
function withStance (pose: Record<string, Pose>, stance: Record<string, Rot>, weight = 1): Record<string, Pose> {
	for (const [bone, r] of Object.entries(stance)) {
		const p = pose[bone] ?? (pose[bone] = {});
		const rot = p.rot ?? [0, 0, 0];
		p.rot = [rot[0] + r[0] * weight, rot[1] + r[1] * weight, rot[2] + r[2] * weight];
	}
	return pose;
}

function chibiClips (spec: ChibiSpec): Clip[] {
	const stance = stanceOf(spec);
	const holdL = !!stance.armL, holdR = !!stance.armR;
	const clips: Clip[] = [
		{
			name: "idle", duration: 2,
			pose: (t) => {
				const p = Math.sin((t / 2) * TAU);
				return withStance({
					root: { pos: [0, p * 0.15, 0] },
					head: { rot: [0, 0, Math.sin((t / 2) * TAU + 1) * 0.05] },
					armL: { rot: [0, 0, holdL ? 0 : 0.05 + p * 0.03] },
					armR: { rot: [holdR ? p * 0.03 : 0, 0, holdR ? 0 : -0.05 - p * 0.03] }
				}, stance);
			}
		},
		{
			name: "walk", duration: 0.5,
			pose: (t) => {
				const a = (t / 0.5) * TAU, s = Math.sin(a);
				return withStance({
					root: { pos: [0, (1 - Math.cos(2 * a)) * 0.35, 0] },
					body: { rot: [0, 0, s * 0.05] },
					head: { rot: [0, 0, -s * 0.04] },
					legL: { rot: [s * 0.7, 0, 0] },
					legR: { rot: [-s * 0.7, 0, 0] },
					armL: { rot: [holdL ? -s * 0.12 : -s * 0.55, 0, 0.05] },
					armR: { rot: [holdR ? s * 0.15 : s * 0.55, 0, -0.05] }
				}, stance);
			}
		},
		{ name: "attack", duration: 0.7, pose: (t) => withStance(attackPose(spec.attack ?? "swing", t), stance) },
		{
			name: "hit", duration: 0.45,
			pose: (t) => {
				const k = bump(t, 0, 0.45);
				return withStance({
					root: { pos: [0, 0, -1.2 * k] },
					body: { rot: [0.35 * k, 0, 0] },
					head: { rot: [0.25 * k, 0, 0.1 * k] },
					armL: { rot: [-0.3 * k, 0, 0.4 * k] },
					armR: { rot: [-0.3 * k, 0, -0.4 * k] }
				}, stance);
			}
		},
		{
			name: "death", duration: 1,
			pose: (t) => {
				const k = Math.max(0, keys(t, [[0, 0], [0.15, -0.15], [0.6, 1]]));
				return withStance({
					root: { rot: [0, 0, 1.5 * k], pos: [0, -2.6 * k, 0] },
					head: { rot: [0, 0, 0.2 * k] },
					armL: { rot: [0, 0, 1.2 * k] },
					armR: { rot: [-0.5 * k, 0, -0.4 * k] },
					legL: { rot: [0, 0, 0.3 * k] }
				}, stance, 1 - k);
			}
		}
	];
	if (spec.worker) {
		clips.push({
			name: "work", duration: 0.8,
			pose: (t) => {
				const raise = keys(t, [[0, -0.2], [0.35, -2.4], [0.48, -0.15], [0.8, -0.2]]);
				return {
					body: { rot: [keys(t, [[0, 0], [0.35, -0.08], [0.48, 0.25], [0.8, 0]]), 0, 0] },
					head: { rot: [keys(t, [[0, 0], [0.48, 0.15], [0.8, 0]]), 0, 0] },
					armR: { rot: [raise, 0, 0] },
					armL: { rot: [raise * 0.85, 0, 0] },
					legL: { rot: [-0.15, 0, 0] },
					legR: { rot: [0.15, 0, 0] }
				};
			}
		});
	}
	return clips;
}

/** Each attack as a change from the stance (which the clip adds). */
function attackPose (kind: Attack, t: number): Record<string, Pose> {
	switch (kind) {
		case "bow": {
			// Bow raised level, the string drawn back, loosed
			const up = keys(t, [[0, 0], [0.2, -0.4], [0.55, -0.4], [0.7, 0]]);
			const draw = keys(t, [[0, 0], [0.2, -0.8], [0.42, -0.9], [0.46, -0.4], [0.7, 0]]);
			return {
				body: { rot: [0, keys(t, [[0, 0], [0.2, 0.35], [0.55, 0.35], [0.7, 0]]), 0] },
				armL: { rot: [up, 0, 0] },
				armR: { rot: [draw, keys(t, [[0, 0], [0.2, -0.6], [0.46, -0.6], [0.7, 0]]), 0] }
			};
		}
		case "fire": {
			// Gun brought up level, a kick, lowered
			const aim = keys(t, [[0, 0], [0.18, -0.55], [0.55, -0.55], [0.7, 0]]);
			const kick = bump(t, 0.3, 0.45);
			return {
				body: { rot: [-0.1 * kick, 0, 0] },
				armR: { rot: [aim - 0.35 * kick, 0, 0] },
				armL: { rot: [aim * 0.85 - 0.3 * kick, 0, 0] },
				root: { pos: [0, 0, -0.6 * kick] }
			};
		}
		case "thrust": {
			const reach = keys(t, [[0, 0], [0.2, -0.6], [0.32, -1.3], [0.5, -0.9], [0.7, 0]]);
			return {
				body: { rot: [keys(t, [[0, 0], [0.32, 0.25], [0.7, 0]]), 0, 0] },
				armR: { rot: [reach, 0, 0] },
				root: { pos: [0, 0, keys(t, [[0, 0], [0.32, 1.2], [0.7, 0]])] }
			};
		}
		default: {
			// Wind up over the head, swing down
			const arm = keys(t, [[0, 0], [0.25, -2], [0.38, 0.35], [0.7, 0]]);
			return {
				body: { rot: [keys(t, [[0, 0], [0.25, -0.1], [0.38, 0.3], [0.7, 0]]), keys(t, [[0, 0], [0.25, 0.3], [0.38, -0.2], [0.7, 0]]), 0] },
				head: { rot: [keys(t, [[0, 0], [0.38, 0.15], [0.7, 0]]), 0, 0] },
				armR: { rot: [arm, 0, 0] },
				armL: { rot: [keys(t, [[0, 0], [0.25, -0.3], [0.38, 0.2], [0.7, 0]]), 0, 0.1] }
			};
		}
	}
}

// ------------------------------------------------------------------
// Hats and outfits
// ------------------------------------------------------------------

const hats = {
	headband: (c: number) => (v: Vox) => {
		v.box(-5.35, 17.6, -4.85, 10.7, 1.2, 9.7, c);
		v.box(-6.2, 16.2, -4.2, 0.8, 3.4, 1, 0xf5f0e6).box(-6.2, 19.4, -4.2, 0.8, 1, 1, 0xd94a4a);
	},
	hood: (c: number) => (v: Vox) => {
		v.box(-5.6, 18.8, -5.1, 11.2, 2.8, 10, c).box(-5.6, 12, -5.1, 0.7, 7, 10, c).box(4.9, 12, -5.1, 0.7, 7, 10, c).box(-5.6, 11, -5.2, 11.2, 8, 0.8, c);
		v.box(-5.6, 19.5, 4.5, 11.2, 1.4, 0.7, c).cbox(0, 20.5, -5.6, 3, 2, 2, c);
	},
	helmet: (c: number, crest?: number) => (v: Vox) => {
		v.box(-5.45, 18.2, -4.95, 10.9, 3, 9.9, c).box(-5.45, 14.5, -4.95, 0.6, 3.7, 7, c).box(4.85, 14.5, -4.95, 0.6, 3.7, 7, c).box(-5.45, 13.5, -4.95, 10.9, 4.7, 0.7, c);
		v.box(-0.5, 15.8, 4.5, 1, 2.6, 0.5, c).box(-5.5, 18, 4.45, 11, 0.8, 0.6, c);
		if (crest !== undefined) v.box(-0.6, 21.2, -4, 1.2, 1.8, 8, crest);
	},
	tricorn: (c: number) => (v: Vox) => {
		v.box(-6.3, 19.6, -5.6, 12.6, 1, 11.2, c).box(-4.6, 20.6, -4, 9.2, 2.6, 8, c).box(-6.3, 20.6, -5.6, 12.6, 1.4, 1, c).box(-6.3, 20.6, -5.6, 1, 1.4, 11.2, c).box(5.3, 20.6, -5.6, 1, 1.4, 11.2, c);
		v.box(-4.7, 20.6, 3.8, 9.4, 0.5, 0.4, GOLD);
	},
	shako: (c: number) => (v: Vox) => {
		v.box(-4.6, 19.5, -4.6, 9.2, 4.5, 9.2, c).box(-4.7, 19.4, 3.4, 9.4, 0.6, 2.6, 0x1d1d22).box(-0.6, 21, 4.6, 1.2, 1.6, 0.4, GOLD).cbox(0, 24, 0, 1.4, 1.6, 1.4, 0xd94a4a);
	},
	tinhat: (c: number) => (v: Vox) => {
		v.box(-5.7, 18, -5.3, 11.4, 3.2, 10.6, c).box(-4.6, 21.2, -4.4, 9.2, 1.2, 8.8, c).box(-6.4, 17.8, -6, 12.8, 0.6, 12, c);
	},
	visor: (c: number, glow: number) => (v: Vox) => {
		v.box(-5.6, 18, -5.2, 11.2, 3.6, 10.4, c).box(-5.6, 12, -5.2, 0.7, 6, 9, c).box(4.9, 12, -5.2, 0.7, 6, 9, c).box(-5.6, 11.6, -5.3, 11.2, 7, 0.8, c);
		v.box(-4.6, 17.3, 4.5, 9.2, 0.9, 0.5, glow).box(4.9, 21.4, -1, 0.5, 2.6, 0.5, c).cbox(5.15, 24, -0.75, 1, 1, 1, glow);
	},
	straw: (band: number) => (v: Vox) => {
		v.box(-6.4, 19.6, -6.4, 12.8, 0.8, 12.8, 0xf2d27a).box(-4.6, 20.4, -4.6, 9.2, 2.8, 9.2, 0xf2d27a).box(-4.7, 20.4, -4.7, 9.4, 0.9, 9.4, band);
	},
	miner: (v: Vox) => {
		v.box(-5.6, 18.2, -5.2, 11.2, 3.4, 10.4, 0xf7c531).box(-4.4, 21.6, -4, 8.8, 0.8, 8, 0xf7c531).box(-6.2, 18, -5.8, 12.4, 0.6, 11.6, 0xe0ac1f);
		v.cbox(0, 19, 5.3, 2.4, 2, 1, 0x5b5b5b).cbox(0, 19.3, 5.8, 1.6, 1.4, 0.4, 0xfff6c2);
	},
	beanie: (c: number) => (v: Vox) => {
		v.box(-5.5, 18.4, -5, 11, 3.2, 10, c).box(-5.6, 18, -5.1, 11.2, 1.2, 10.2, 0xf3efe6).cbox(0, 21.6, 0, 2.4, 1.8, 2.4, 0xf3efe6);
	},
	souwester: (v: Vox) => {
		v.box(-5.6, 18.4, -5.4, 11.2, 3.2, 10.6, 0xf7cf3d).box(-6.6, 18, -7.4, 13.2, 0.6, 12.4, 0xf7cf3d);
	},
	kettle: (c: number) => (v: Vox) => {
		v.box(-5.5, 18, -5.1, 11, 3.4, 10.2, c).box(-7, 18, -6.6, 14, 0.7, 13.2, c).box(-4.6, 21.4, -4.2, 9.2, 0.8, 8.4, c);
	},
	bandana: (c: number) => (v: Vox) => {
		v.box(-5.4, 18.3, -4.9, 10.8, 2.6, 9.8, c).cbox(0, 17.5, -5.4, 2, 2, 1, c);
	}
};

const outfits = {
	tunic: (c: number) => (v: Vox) => {
		v.box(-3.6, 4.4, -2.1, 7.2, 1.4, 4.2, c);
	},
	sash: (c: number) => (v: Vox) => {
		v.box(-2, 8, 2, 1.6, 3, 0.2, c).box(-0.6, 6.5, 2, 1.6, 2, 0.2, c).box(0.8, 5, 2, 1.6, 2, 0.2, c);
	},
	buttons: (c: number) => (v: Vox) => {
		for (const y of [6, 7.6, 9.2]) v.box(-0.4, y, 2, 0.8, 0.8, 0.2, c);
	},
	crossbelts: (c: number) => (v: Vox) => {
		v.box(-3.55, 7.5, 2, 7.1, 0.8, 0.2, c).box(-0.4, 5, 2, 0.8, 6, 0.2, c);
	},
	apron: (c: number) => (v: Vox) => {
		v.box(-2.8, 3.6, 2, 5.6, 6.8, 0.4, c).box(-3.6, 10, 2, 0.8, 1, 0.2, c).box(2.8, 10, 2, 0.8, 1, 0.2, c);
	},
	plaid: (v: Vox) => {
		v.box(-3.55, 7, -2.05, 7.1, 0.8, 4.1, 0x2b2b33).box(-1.2, 5, 2.02, 0.8, 6, 0.1, 0x2b2b33);
	},
	armour: (c: number) => (v: Vox) => {
		v.box(-3.7, 6.5, -2.2, 7.4, 4.6, 4.4, c).box(-4.6, 10, -2.3, 9.2, 1.4, 4.6, c);
	},
	fur: (c: number) => (v: Vox) => {
		v.box(-3.7, 8.6, -2.2, 7.4, 2.6, 4.4, c).box(-3.7, 5.2, 1.9, 2.4, 3.6, 0.3, c).box(1.3, 5.2, 1.9, 2.4, 3.6, 0.3, c);
		v.box(-1.2, 6.4, 2.05, 2.4, 0.6, 0.2, 0x5a3b28);
	},
	plate: (c: number, tabard: number) => (v: Vox) => {
		v.box(-3.7, 6.6, -2.2, 7.4, 4.6, 4.4, c).box(-1.4, 4.2, 2.1, 2.8, 6.4, 0.4, tabard).box(-0.6, 9.6, 2.4, 1.2, 1.2, 0.3, GOLD);
	},
	quilted: (c: number) => (v: Vox) => {
		for (const y of [6.2, 7.8, 9.4]) v.box(-3.6, y, -2.1, 7.2, 0.4, 4.2, c);
	},
	ammo: (c: number) => (v: Vox) => {
		for (let i = 0; i < 6; i++) v.box(-3.4 + i * 1.15, 5.4 + i * 0.95, 2, 1, 1, 0.5, c);
		for (let i = 0; i < 6; i++) v.box(2.4 - i * 1.15, 5.4 + i * 0.95, 2.1, 1, 1, 0.5, shade(c, 0.9));
	},
	collar: (c: number) => (v: Vox) => {
		v.box(-3.6, 10.2, -2.1, 7.2, 0.9, 4.2, c);
	}
};

// ------------------------------------------------------------------
// The units and workers
// ------------------------------------------------------------------

export const CHARACTERS: Record<string, () => Rigged> = {
	// Each fighter has its own shape, colour and a big signature piece of kit, so it reads at a glance
	warrior: () => chibi({
		build: "soldier", skin: SKIN.tan, hair: HAIR.brown, hairStyle: "spiky", shirt: 0x8c5530, sleeves: SKIN.tan, pants: 0x6e4a2b, belt: 0x4a3020, paint: 0xd94a4a,
		hat: hats.headband(0xd94a4a), outfit: outfits.fur(0xe3cfa8), weapon: "club", offhand: "buckler", shieldColor: 0x9b6a3c, shieldEmblem: STEEL, seed: 11
	}),
	archer: () => chibi({
		build: "slim", skin: SKIN.light, hair: HAIR.ginger, shirt: 0x6b8f3a, sleeves: 0x4f7a2e, pants: 0x6b4a2e, belt: 0x5b3a22,
		hat: hats.hood(0x3f7d3c), back: "cloakQuiver", backColor: 0x3f7d3c, offhand: "bow", attack: "bow", seed: 12
	}),
	swordsman: () => chibi({
		build: "soldier", skin: SKIN.light, hair: HAIR.blonde, shirt: 0xc93c3c, pants: 0x55433a, belt: 0x3d2b20, pauldrons: IRON,
		hat: helmetWith(IRON, 0xd94a4a), outfit: outfits.plate(IRON, 0xc93c3c), weapon: "sword", offhand: "shield", shieldColor: 0xc93c3c, shieldEmblem: GOLD, seed: 13
	}),
	defender: () => chibi({
		build: "heavy", skin: SKIN.brown, hair: HAIR.black, shirt: 0x3b5fa8, pants: 0x3a3d48, belt: 0x2d2a28, pauldrons: STEEL,
		hat: helmetWith(STEEL, 0x3b5fa8), outfit: outfits.armour(STEEL), weapon: "spear", offhand: "tower", shieldColor: 0x3b5fa8, shieldEmblem: GOLD, attack: "thrust", seed: 14
	}),
	settler: () => chibi({ skin: SKIN.tan, hair: HAIR.brown, hairStyle: "bun", shirt: 0xc98f4e, pants: 0x7b5a3a, belt: 0x5a3d26, hat: hats.straw(0xd94a4a), weapon: "staff", back: "pack", seed: 15 }),
	crossbowman: () => chibi({
		build: "soldier", skin: SKIN.light, hair: HAIR.brown, shirt: 0xd9a441, sleeves: 0xb8862f, pants: 0x5b4a3a, belt: 0x3d2b20,
		hat: hats.kettle(STEEL), outfit: outfits.quilted(0xb8862f), weapon: "crossbow", back: "quiver", attack: "fire", seed: 16
	}),
	musketeer: () => chibi({
		build: "soldier", skin: SKIN.light, hair: HAIR.grey, hairStyle: "long", shirt: 0x2f5aa8, pants: 0xe9e3d3, shoes: 0x22222a, coatTails: 0x2f5aa8,
		hat: hats.tricorn(0x23232b), outfit: (v) => { outfits.crossbelts(0xf3efe6)(v); outfits.buttons(GOLD)(v); }, weapon: "musket", attack: "fire", seed: 17
	}),
	rifleman: () => chibi({
		build: "soldier", skin: SKIN.tan, hair: HAIR.black, shirt: 0x4f6b3a, pants: 0x3f4a33, shoes: 0x2d2a28, belt: 0x3d3326,
		hat: hats.shako(0x2f3d4f), outfit: (v) => { outfits.buttons(GOLD)(v); outfits.collar(0xd94a4a)(v); }, weapon: "rifle", attack: "fire", seed: 18
	}),
	machineGunner: () => chibi({
		build: "heavy", skin: SKIN.brown, hair: HAIR.black, shirt: 0x6b7350, pants: 0x585f43, shoes: 0x2d2a28, belt: 0x3d3326,
		hat: hats.tinhat(0x6b7350), outfit: outfits.ammo(0xd9b24a), weapon: "mg", attack: "fire", seed: 19
	}),
	infantry: () => chibi({
		build: "soldier", skin: SKIN.light, hair: HAIR.brown, shirt: 0x7a8456, pants: 0x5c653f, shoes: 0x2d2a28, belt: 0x3d3326,
		hat: hats.tinhat(0x56603a), outfit: outfits.collar(0x5c653f), weapon: "rifle", back: "pack", backColor: 0x56603a, attack: "fire", seed: 20
	}),
	mechInfantry: () => chibi({
		build: "heavy", skin: SKIN.tan, hair: HAIR.black, shirt: 0x6b7a86, pants: 0x4d5965, shoes: 0x2a2d33, belt: 0x2a2d33, pauldrons: 0x8a97a3,
		hat: hats.visor(0x7d8a96, 0xff9d3c), outfit: outfits.armour(0x8a97a3), weapon: "rifle", back: "jetpack", attack: "fire", seed: 21
	}),
	laserTrooper: () => chibi({
		build: "slim", skin: SKIN.dark, hair: HAIR.black, shirt: 0xeef2f7, pants: 0xc9d2dc, shoes: 0x3a4250, belt: 0x4ef0ff, pauldrons: 0xdde4ec,
		hat: hats.visor(0xeef2f7, 0x4ef0ff), outfit: outfits.armour(0xdde4ec), weapon: "laser", attack: "fire", seed: 22
	}),
	exoTrooper: () => chibi({
		build: "heavy", skin: SKIN.light, hair: HAIR.blonde, shirt: 0x3c4654, pants: 0x2f3742, shoes: 0x1f242b, belt: 0x4ef0ff, pauldrons: 0x56637a,
		hat: hats.visor(0x56637a, 0x4ef0ff), outfit: outfits.armour(0x56637a), weapon: "laser", back: "jetpack", backColor: 0x3c4654, attack: "fire", bulky: true, seed: 23
	}),
	// Workers
	workerCarrier: () => chibi({ skin: SKIN.tan, hair: HAIR.brown, shirt: 0xd9b26a, pants: 0x7b5a3a, belt: 0x5a3d26, hat: hats.bandana(0x5f8ccc), back: "sack", worker: true, seed: 31 }),
	workerMiner: () => chibi({ skin: SKIN.light, hair: HAIR.black, shirt: 0x5a6f8a, pants: 0x4a4038, belt: 0x3a2c22, hat: hats.miner, weapon: "pickaxe", worker: true, seed: 32 }),
	workerWoodcutter: () => chibi({ skin: SKIN.light, hair: HAIR.ginger, shirt: 0xc73a3a, pants: 0x3d4f73, belt: 0x3a2c22, hat: hats.beanie(0x2f7d4a), outfit: outfits.plaid, weapon: "axe", worker: true, seed: 33 }),
	workerFisher: () => chibi({ skin: SKIN.tan, hair: HAIR.grey, shirt: 0xf7cf3d, pants: 0x3d4f73, shoes: 0x3a6fc0, hat: hats.souwester, weapon: "rod", worker: true, seed: 34 }),
	workerFarmer: () => chibi({ skin: SKIN.brown, hair: HAIR.brown, shirt: 0xf3efe6, pants: 0x4f6fa8, belt: 0x6b4a2e, hat: hats.straw(0x4f6fa8), outfit: (v) => v.box(-2.2, 5, 2, 1, 6, 0.2, 0x4f6fa8).box(1.2, 5, 2, 1, 6, 0.2, 0x4f6fa8), weapon: "hoe", worker: true, seed: 35 }),
	workerSmith: () => chibi({ skin: SKIN.tan, hair: HAIR.black, hairStyle: "bald", shirt: 0xb58a6a, pants: 0x4a4038, hat: hats.bandana(0x8c2f2f), outfit: outfits.apron(0x5b3a26), weapon: "hammer", worker: true, seed: 36 })
};

function helmetWith (c: number, crest?: number): (v: Vox) => void {
	return hats.helmet(c, crest);
}

// ------------------------------------------------------------------
// Riders: a pony and a little rider
// ------------------------------------------------------------------

interface RiderSpec {
	coat: number;
	mane: number;
	cloth?: number;
	rider: ChibiSpec;
	weapon: Weapon;
	armoured?: boolean;
}

// Pony bones
const P_ROOT = 0, P_HEAD = 1, P_FL = 2, P_FR = 3, P_BL = 4, P_BR = 5, P_TAIL = 6, R_BODY = 7, R_HEAD = 8, R_ARM_R = 9, R_ARM_L = 10;
const PONY_BONES: Bone[] = [
	{ name: "root", parent: -1, pivot: [0, 9, 0] },
	{ name: "neck", parent: P_ROOT, pivot: [0, 12, 5] },
	{ name: "legFL", parent: P_ROOT, pivot: [2, 7, 4.5] },
	{ name: "legFR", parent: P_ROOT, pivot: [-2, 7, 4.5] },
	{ name: "legBL", parent: P_ROOT, pivot: [2, 7, -4.5] },
	{ name: "legBR", parent: P_ROOT, pivot: [-2, 7, -4.5] },
	{ name: "tail", parent: P_ROOT, pivot: [0, 12, -6.5] },
	{ name: "body", parent: P_ROOT, pivot: [0, 14, -0.5] },
	{ name: "head", parent: R_BODY, pivot: [0, 19.5, -0.5] },
	{ name: "armR", parent: R_BODY, pivot: [-4, 19, -0.5] },
	{ name: "armL", parent: R_BODY, pivot: [4, 19, -0.5] }
];

function rider (spec: RiderSpec): Rigged {
	const v = new Vox(41);
	const coat = spec.coat;
	// The pony: a chunky body on short legs
	v.on(P_ROOT, () => {
		v.box(-3.5, 7, -6.5, 7, 6, 13, coat);
		if (spec.cloth !== undefined) {
			v.box(-3.8, 6.2, -5, 7.6, 5.2, 9, spec.cloth).box(-3.9, 6, -5.2, 7.8, 0.8, 9.4, GOLD);
		}
		// Saddle
		v.box(-2.6, 13, -3, 5.2, 1, 5, LEATHER).box(-2.8, 12.5, -3.2, 0.4, 2.5, 1, LEATHER).box(2.4, 12.5, -3.2, 0.4, 2.5, 1, LEATHER);
	});
	v.on(P_HEAD, () => {
		v.box(-2, 11, 4, 4, 6, 4, coat).box(-2.2, 15, 5, 4.4, 4.5, 7.5, coat).box(-1.6, 15.2, 12.3, 3.2, 2.6, 0.4, 0xe9c9a8);
		v.box(-2.3, 17.5, 9.5, 0.5, 1.2, 1.2, EYE).box(1.8, 17.5, 9.5, 0.5, 1.2, 1.2, EYE);
		v.box(-1.6, 19.5, 5.5, 1, 1.6, 1, coat).box(0.6, 19.5, 5.5, 1, 1.6, 1, coat);
		v.box(-0.8, 12, 3.4, 1.6, 8, 3.6, spec.mane).box(-0.8, 18, 6, 1.6, 1.4, 3, spec.mane);
		if (spec.armoured) v.box(-2.4, 17, 7, 4.8, 2.4, 4, IRON);
	});
	for (const [bone, x, z] of [[P_FL, 2, 4.5], [P_FR, -2, 4.5], [P_BL, 2, -4.5], [P_BR, -2, -4.5]] as const) {
		v.on(bone, () => {
			v.cbox(x, 1.2, z, 2.2, 6.3, 2.2, coat).cbox(x, 0, z + 0.1, 2.4, 1.4, 2.4, 0x3a2a20);
		});
	}
	v.on(P_TAIL, () => {
		v.box(-0.9, 6, -8, 1.8, 6.8, 1.8, spec.mane);
	});
	// The rider, legs astride
	const r = spec.rider;
	v.on(R_BODY, () => {
		v.box(-3.5, 14, -2.5, 7, 6, 4, r.shirt);
		if (r.belt !== undefined) v.box(-3.6, 14.8, -2.6, 7.2, 0.9, 4.2, r.belt);
		if (spec.armoured) v.box(-3.7, 15.5, -2.7, 7.4, 4.6, 4.4, IRON);
		// Legs over the pony's sides
		v.box(3.4, 11, -2, 2.4, 3.5, 3, r.pants).box(3.3, 10.2, -1.6, 2.6, 1.2, 3.6, r.shoes ?? 0x5a3b28);
		v.box(-5.8, 11, -2, 2.4, 3.5, 3, r.pants).box(-5.9, 10.2, -1.6, 2.6, 1.2, 3.6, r.shoes ?? 0x5a3b28);
		if (r.back === "cape") v.box(-3.8, 13, -3.1, 7.6, 7, 0.6, r.backColor ?? 0xc0392b);
	});
	v.on(R_HEAD, () => {
		const head = new Vox();
		head.box(-5, 11, -4.5, 10, 9, 9, r.skin);
		face(head);
		hair(head, r.hairStyle ?? "short", r.hair ?? HAIR.brown);
		r.hat?.(head);
		v.add(head, 0, 8.5, -0.5);
	});
	for (const [bone, s] of [[R_ARM_L, 1], [R_ARM_R, -1]] as const) {
		v.on(bone, () => {
			const x0 = s > 0 ? 3.5 : -5.5;
			v.box(x0, 15.5, -1.5, 2, 4.5, 2, r.shirt).box(x0 + 0.1, 14, -1.4, 1.8, 1.5, 1.8, r.skin);
		});
	}
	v.on(R_ARM_R, () => {
		const w = new Vox();
		weaponBoxes(w, spec.weapon, spec.cloth);
		v.add(w, 0, 9, -0.5);
	});
	if (r.offhand === "shield") {
		v.on(R_ARM_L, () => {
			v.box(5.5, 13.5, -3.1, 0.9, 6, 5.2, r.shieldColor ?? 0xc0392b).box(6.3, 15.5, -1.2, 0.4, 2, 1.4, GOLD);
		});
	}
	return { vox: v, bones: PONY_BONES, clips: riderClips(spec.weapon === "lance" ? "thrust" : "swing") };
}

function riderClips (attack: Attack): Clip[] {
	return [
		{
			name: "idle", duration: 2.4,
			pose: (t) => {
				const p = Math.sin((t / 2.4) * TAU);
				return {
					neck: { rot: [p * 0.06 + 0.04, 0, 0] },
					tail: { rot: [0.25, Math.sin((t / 1.2) * TAU) * 0.35, 0] },
					body: { pos: [0, p * 0.12, 0] },
					head: { rot: [0, 0, Math.sin((t / 2.4) * TAU + 1) * 0.05] }
				};
			}
		},
		{
			name: "walk", duration: 0.5,
			pose: (t) => {
				// A trot: diagonal pairs together
				const a = (t / 0.5) * TAU, s = Math.sin(a);
				const bob = (1 - Math.cos(2 * a)) * 0.45;
				return {
					root: { pos: [0, bob, 0], rot: [s * 0.03, 0, 0] },
					legFL: { rot: [-s * 0.6, 0, 0] },
					legBR: { rot: [-s * 0.6, 0, 0] },
					legFR: { rot: [s * 0.6, 0, 0] },
					legBL: { rot: [s * 0.6, 0, 0] },
					neck: { rot: [Math.cos(2 * a) * 0.08, 0, 0] },
					tail: { rot: [0.5, s * 0.25, 0] },
					body: { pos: [0, -bob * 0.4, 0] },
					armL: { rot: [-0.3, 0, 0.1] },
					armR: { rot: [-0.2 + s * 0.15, 0, -0.1] }
				};
			}
		},
		{
			name: "attack", duration: 0.75,
			pose: (t) => {
				const rear = bump(t, 0, 0.6);
				const arm = attack === "thrust"
					? keys(t, [[0, 0], [0.2, -1], [0.34, -1.7], [0.5, -1.2], [0.75, 0]])
					: keys(t, [[0, 0], [0.25, -2.6], [0.4, -0.3], [0.75, 0]]);
				return {
					root: { rot: [-0.3 * rear, 0, 0], pos: [0, 1.5 * rear, 0] },
					legFL: { rot: [-0.9 * rear, 0, 0] },
					legFR: { rot: [-0.7 * rear, 0, 0] },
					neck: { rot: [-0.3 * rear, 0, 0] },
					body: { rot: [0.3 * rear, 0, 0] },
					armR: { rot: [arm, 0, 0] }
				};
			}
		},
		{
			name: "hit", duration: 0.45,
			pose: (t) => {
				const k = bump(t, 0, 0.45);
				return {
					root: { pos: [0, 0, -1.2 * k], rot: [0, 0, 0.08 * k] },
					neck: { rot: [-0.25 * k, 0.2 * k, 0] },
					body: { rot: [0.3 * k, 0, 0] },
					armL: { rot: [-0.4 * k, 0, 0.4 * k] },
					armR: { rot: [-0.4 * k, 0, -0.4 * k] }
				};
			}
		},
		{
			name: "death", duration: 1.1,
			pose: (t) => {
				const k = Math.max(0, keys(t, [[0, 0], [0.15, -0.1], [0.7, 1]]));
				return {
					root: { rot: [0, 0, 1.45 * k], pos: [0, -4.5 * k, 0] },
					legFL: { rot: [-0.3 * k, 0, -0.3 * k] },
					legBL: { rot: [0.3 * k, 0, -0.3 * k] },
					neck: { rot: [0.4 * k, 0, 0] },
					armL: { rot: [0, 0, 1 * k] }
				};
			}
		}
	];
}

export const RIDERS: Record<string, () => Rigged> = {
	rider: () => rider({ coat: 0xb0784a, mane: 0x4a3020, weapon: "spear", rider: { skin: SKIN.tan, hair: HAIR.black, shirt: 0x5f8ccc, pants: 0x6e4a2b, belt: 0x4a3020, hat: hats.headband(0x5f8ccc) } }),
	knight: () => rider({ coat: 0xf0ebe0, mane: 0xc9c4bd, cloth: 0x3a6fc0, weapon: "lance", armoured: true, rider: { skin: SKIN.light, hair: HAIR.blonde, shirt: 0x3a6fc0, pants: 0x55433a, hat: helmetWith(IRON, 0xd94a4a), offhand: "shield", shieldColor: 0x3a6fc0, back: "cape", backColor: 0xd94a4a } }),
	cavalry: () => rider({ coat: 0x5e3b25, mane: 0x2a1c14, cloth: 0xd04545, weapon: "saber", rider: { skin: SKIN.light, hair: HAIR.brown, shirt: 0x2f5aa8, pants: 0xe9e3d3, shoes: 0x22222a, belt: 0xf3efe6, hat: hats.shako(0x23232b) } })
};
