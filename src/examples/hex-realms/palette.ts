import { IgeTexture } from "@/engine/core/IgeTexture";

/**
 * Colour palette texture for the terrain.
 *
 * The WebGL renderer's lit shader does not read per-vertex colours, so the
 * terrain gets its colours from a small texture instead: each colour is a
 * row holding a horizontal gradient from dark to bright, and every vertex
 * has a UV pointing at (shade, colour row). A triangle whose vertices share
 * a row can blend shades smoothly (the bevel around each tile does this)
 * while keeping one colour family.
 *
 * The texture's height is deliberately not a power of two: the renderer then
 * uses plain LINEAR filtering without mipmaps, so distant tiles never pick up
 * colours bleeding in from neighbouring rows.
 */

/** sRGB base colours (0-255). Shade 1.0 reproduces these exactly. */
const BASE_COLORS = {
	deepOcean: [27, 74, 132],
	ocean: [46, 128, 186],
	seabed: [22, 52, 92],
	ice: [216, 233, 243],
	iceWall: [150, 186, 208],
	grassland: [110, 176, 74],
	plains: [181, 178, 92],
	desert: [226, 196, 124],
	tundra: [140, 151, 122],
	snow: [236, 242, 246],
	dirt: [120, 88, 58],
	sand: [176, 140, 86],
	frozenDirt: [116, 110, 102],
	rock: [124, 116, 106],
	snowCap: [246, 248, 251],
	forest: [46, 112, 54],
	jungle: [38, 136, 70],
	pine: [50, 92, 74],
	// Unexplored areas: clouds in the tile style, a parchment map in the natural style
	cloud: [246, 248, 252],
	cloudShade: [198, 208, 224],
	parchment: [221, 202, 160]
};

/**
 * How explored-but-unseen ("fogged") areas look: half desaturated and
 * darker, with a cool dusk tint.
 */
export function fogColor (c: ArrayLike<number>): [number, number, number] {
	const grey = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
	// Half the colour kept, dimmed, with a cool dusk tint: still readable as land, sea and forest
	const fade = (v: number, tint: number) => Math.min(255, (grey * 0.5 + v * 0.5) * 0.64 + tint);
	return [fade(c[0], 6), fade(c[1], 11), fade(c[2], 22)];
}

function mix (a: number[], b: number[], t: number): number[] {
	return a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
}

/**
 * Base colours plus pre-mixed "terrain seen through trees" colours. Distant
 * (lite) chunks colour forested tiles with these instead of drawing trees,
 * matching how the detailed tiles average out from far away.
 */
export const PALETTE_COLORS = {
	...BASE_COLORS,
	grasslandForest: mix(BASE_COLORS.grassland, BASE_COLORS.forest, 0.45),
	plainsForest: mix(BASE_COLORS.plains, BASE_COLORS.forest, 0.45),
	tundraForest: mix(BASE_COLORS.tundra, BASE_COLORS.forest, 0.45),
	grasslandJungle: mix(BASE_COLORS.grassland, BASE_COLORS.jungle, 0.5),
	plainsJungle: mix(BASE_COLORS.plains, BASE_COLORS.jungle, 0.5),
	tundraPine: mix(BASE_COLORS.tundra, BASE_COLORS.pine, 0.5),
	grasslandPine: mix(BASE_COLORS.grassland, BASE_COLORS.pine, 0.5),
	plainsPine: mix(BASE_COLORS.plains, BASE_COLORS.pine, 0.5)
};

export type PaletteKey = keyof typeof PALETTE_COLORS;

/** The pre-mixed palette key for a terrain colour under a forest type, if there is one. */
export function forestedKey (top: PaletteKey, forest: "Forest" | "Jungle" | "Pine"): PaletteKey | undefined {
	const key = `${top}${forest}`;
	return key in PALETTE_COLORS ? (key as PaletteKey) : undefined;
}

/** Darkest and brightest shade multipliers stored in each row. */
export const SHADE_MIN = 0.4;
export const SHADE_MAX = 1.3;

const WIDTH = 64;
const ROW_HEIGHT = 4;
const KEYS = Object.keys(PALETTE_COLORS) as PaletteKey[];
// Every colour has a normal row and, after all of them, a fogged row
const ROWS = KEYS.length * 2;
// Pad by a row if needed so the height is never a power of two (see above)
const HEIGHT = ((ROWS * ROW_HEIGHT) & (ROWS * ROW_HEIGHT - 1)) === 0 ? (ROWS + 1) * ROW_HEIGHT : ROWS * ROW_HEIGHT;

const ROW_INDEX: Record<string, number> = {};
KEYS.forEach((key, index) => {
	ROW_INDEX[key] = index;
});

/** V coordinate of the middle of a colour's row (its fogged version if `fogged`). */
export function paletteV (key: PaletteKey, fogged = false): number {
	const row = ROW_INDEX[key] + (fogged ? KEYS.length : 0);
	return (row * ROW_HEIGHT + ROW_HEIGHT / 2) / HEIGHT;
}

/** U coordinate for a shade multiplier (1 = the base colour). */
export function paletteU (shade: number): number {
	const t = Math.min(1, Math.max(0, (shade - SHADE_MIN) / (SHADE_MAX - SHADE_MIN)));
	return (0.5 + t * (WIDTH - 1)) / WIDTH;
}

/** CSS colour for a palette key at a shade (used by the minimap). */
export function paletteCss (key: PaletteKey, shade = 1): string {
	const [r, g, b] = PALETTE_COLORS[key];
	const c = (v: number) => Math.min(255, Math.round(v * shade));
	return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/** Draws the palette into a canvas and wraps it in an IgeTexture. */
export function createPaletteTexture (id: string): IgeTexture {
	const canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not create a 2D context for the terrain palette");

	const image = ctx.createImageData(WIDTH, HEIGHT);
	for (let row = 0; row < ROWS; row++) {
		const base = PALETTE_COLORS[KEYS[row % KEYS.length]];
		const [r, g, b] = row < KEYS.length ? base : fogColor(base);
		for (let x = 0; x < WIDTH; x++) {
			const shade = SHADE_MIN + (x / (WIDTH - 1)) * (SHADE_MAX - SHADE_MIN);
			for (let y = row * ROW_HEIGHT; y < (row + 1) * ROW_HEIGHT; y++) {
				const o = (y * WIDTH + x) * 4;
				image.data[o] = Math.min(255, Math.round(r * shade));
				image.data[o + 1] = Math.min(255, Math.round(g * shade));
				image.data[o + 2] = Math.min(255, Math.round(b * shade));
				image.data[o + 3] = 255;
			}
		}
	}
	ctx.putImageData(image, 0, 0);

	const texture = new IgeTexture(id);
	// _setImage is the engine's hook for using an existing canvas as a texture
	texture._setImage(canvas as any);
	return texture;
}
