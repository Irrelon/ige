import { IgeTexture } from "@/engine/core/IgeTexture";

/**
 * How a text texture looks (igeTextTexture): the words, and optionally a
 * plate behind them with an edge and an accent bar down its left side.
 * Sizes are in the texture's pixels.
 */
export interface IgeTextStyle {
	/** A CSS font (default "600 28px sans-serif"). */
	font?: string;
	/** Space between letters, as CSS ("4px"; where the browser can). */
	letterSpacing?: string;
	/** The words' colour (default white). */
	color?: string;
	/** The plate behind them (default none: just the words). */
	background?: string;
	/** The plate's edge, drawn inside it. */
	borderColor?: string;
	borderWidth?: number;
	/** The texture's height (default 1.6 × the font's size). */
	height?: number;
	/** Space each side of the words (default 12). */
	padding?: number;
	/** A bar of colour down the left edge (a key, a team, a kind of thing). */
	bar?: { color: string; width: number };
	/** Nudges the words from the middle of the space right of the bar. */
	offsetX?: number;
	offsetY?: number;
	/** Drawn at this many pixels per pixel, for crisp words on high-density screens (default 1); the size reported stays the same. */
	resolution?: number;
}

/** A text texture: shared by everything showing the same words in the same style. */
export interface IgeTextTexture {
	texture: IgeTexture;
	/** Its size in style pixels (before `resolution`), and width over height. */
	width: number;
	height: number;
	aspect: number;
	key: string;
	/** How many hold it (igeTextTexture() adds one, releaseTextTexture() takes one away). */
	users: number;
}

/** Where text textures come from: a canvas, and an IgeTexture made from one (tests replace them). */
export const igeTextBackend = {
	canvas: (): HTMLCanvasElement => document.createElement("canvas"),
	texture: (id: string, canvas: HTMLCanvasElement): IgeTexture => {
		const texture = new IgeTexture(id);
		texture._setImage(canvas as never);
		texture._loaded = true;
		return texture;
	}
};

const cache = new Map<string, IgeTextTexture>();
let nextId = 1;

/**
 * A texture of `text` in `style`, drawn once and shared: everything asking
 * for the same words in the same style gets the same one. Each call holds
 * it once more; releaseTextTexture() lets go, and when nothing holds it any
 * more its texture is destroyed (freeing the GPU copy). Its `aspect` sizes
 * a quad without stretching the words.
 * @example #A label's texture, on a sprite as wide as it needs to be
 *     const label = igeTextTexture("DOCKING BAY", { background: "rgba(0,0,0,0.5)", bar: { color: "#5fe3ff", width: 6 } });
 *     entity.texture(label.texture).height(20).width(20 * label.aspect);
 *     // ...and when it's gone: releaseTextTexture(label)
 */
export function igeTextTexture (text: string, style: IgeTextStyle = {}): IgeTextTexture {
	const key = `${text}\u0000${JSON.stringify(style)}`;
	const held = cache.get(key);
	if (held) {
		held.users++;
		return held;
	}
	const font = style.font ?? "600 28px sans-serif";
	const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 28);
	const height = style.height ?? Math.ceil(size * 1.6);
	const pad = style.padding ?? 12;
	const bar = style.bar?.width ?? 0;
	const res = Math.max(1, style.resolution ?? 1);
	const canvas = igeTextBackend.canvas();
	const c = canvas.getContext("2d") as CanvasRenderingContext2D & { letterSpacing?: string };
	const setFont = () => {
		c.font = font;
		if (style.letterSpacing) c.letterSpacing = style.letterSpacing;
	};
	setFont();
	const width = Math.ceil(c.measureText(text).width) + bar + pad * 2;
	canvas.width = Math.ceil(width * res);
	canvas.height = Math.ceil(height * res);
	// (Sizing a canvas resets its drawing state)
	c.setTransform(res, 0, 0, res, 0, 0);
	setFont();
	if (style.background) {
		c.fillStyle = style.background;
		c.fillRect(0, 0, width, height);
	}
	if (style.borderColor && (style.borderWidth ?? 1) > 0) {
		const b = style.borderWidth ?? 1;
		c.strokeStyle = style.borderColor;
		c.lineWidth = b;
		c.strokeRect(b / 2, b / 2, width - b, height - b);
	}
	if (style.bar) {
		c.fillStyle = style.bar.color;
		c.fillRect(0, 0, bar, height);
	}
	c.fillStyle = style.color ?? "#ffffff";
	c.textAlign = "center";
	c.textBaseline = "middle";
	c.fillText(text, bar + (width - bar) / 2 + (style.offsetX ?? 0), height / 2 + (style.offsetY ?? 0));

	const entry: IgeTextTexture = { texture: igeTextBackend.texture(`igeText${nextId++}`, canvas), width, height, aspect: width / height, key, users: 1 };
	cache.set(key, entry);
	return entry;
}

/** Lets go of a text texture; the last to let go destroys it. */
export function releaseTextTexture (entry: IgeTextTexture | undefined): void {
	if (!entry || entry.users <= 0) return;
	entry.users--;
	if (entry.users > 0) return;
	if (cache.get(entry.key) === entry) cache.delete(entry.key);
	entry.texture.destroy();
}

/** How many text textures are held now (for tests and stats). */
export function textTextureCount (): number {
	return cache.size;
}
