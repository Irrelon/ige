/**
 * Seeded random numbers and 2D simplex noise for deterministic map generation.
 * The same seed always produces the same map.
 */

/** Small, fast seeded PRNG returning floats in [0, 1). */
export function mulberry32 (seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** FNV-1a hash of a string, used to turn a text seed into a number. */
export function hashString (text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Stateless hash of two integers and a seed to a float in [0, 1). */
export function hash2 (x: number, y: number, seed: number): number {
	let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}

const GRAD_X = [1, -1, 1, -1, 1, -1, 0, 0];
const GRAD_Y = [1, 1, -1, -1, 0, 0, 1, -1];
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/**
 * 2D simplex noise (after Stefan Gustavson) with a seeded permutation
 * table. Output is roughly in [-1, 1].
 */
export class SimplexNoise2d {
	protected _perm = new Uint8Array(512);

	constructor (rng: () => number) {
		const p = new Uint8Array(256);
		for (let i = 0; i < 256; i++) p[i] = i;
		for (let i = 255; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			const tmp = p[i];
			p[i] = p[j];
			p[j] = tmp;
		}
		for (let i = 0; i < 512; i++) this._perm[i] = p[i & 255];
	}

	noise (x: number, y: number): number {
		const perm = this._perm;
		const s = (x + y) * F2;
		const i = Math.floor(x + s);
		const j = Math.floor(y + s);
		const t = (i + j) * G2;
		const x0 = x - (i - t);
		const y0 = y - (j - t);
		const i1 = x0 > y0 ? 1 : 0;
		const j1 = x0 > y0 ? 0 : 1;
		const x1 = x0 - i1 + G2;
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1 + 2 * G2;
		const y2 = y0 - 1 + 2 * G2;
		const ii = i & 255;
		const jj = j & 255;

		let n = 0;
		let t0 = 0.5 - x0 * x0 - y0 * y0;
		if (t0 > 0) {
			const g = perm[ii + perm[jj]] & 7;
			t0 *= t0;
			n += t0 * t0 * (GRAD_X[g] * x0 + GRAD_Y[g] * y0);
		}
		let t1 = 0.5 - x1 * x1 - y1 * y1;
		if (t1 > 0) {
			const g = perm[ii + i1 + perm[jj + j1]] & 7;
			t1 *= t1;
			n += t1 * t1 * (GRAD_X[g] * x1 + GRAD_Y[g] * y1);
		}
		let t2 = 0.5 - x2 * x2 - y2 * y2;
		if (t2 > 0) {
			const g = perm[ii + 1 + perm[jj + 1]] & 7;
			t2 *= t2;
			n += t2 * t2 * (GRAD_X[g] * x2 + GRAD_Y[g] * y2);
		}
		return 70 * n;
	}

	/** Fractal Brownian motion: several octaves summed, normalised to ~[-1, 1]. */
	fbm (x: number, y: number, octaves: number, lacunarity = 2, gain = 0.5): number {
		let amplitude = 1;
		let frequency = 1;
		let sum = 0;
		let norm = 0;
		for (let o = 0; o < octaves; o++) {
			sum += amplitude * this.noise(x * frequency, y * frequency);
			norm += amplitude;
			amplitude *= gain;
			frequency *= lacunarity;
		}
		return sum / norm;
	}

	/** Ridged noise in [0, 1]: sharp crests along the zero lines, good for mountain ranges. */
	ridged (x: number, y: number, octaves: number): number {
		let amplitude = 1;
		let frequency = 1;
		let sum = 0;
		let norm = 0;
		for (let o = 0; o < octaves; o++) {
			const r = 1 - Math.abs(this.noise(x * frequency, y * frequency));
			sum += amplitude * r * r;
			norm += amplitude;
			amplitude *= 0.5;
			frequency *= 2;
		}
		return sum / norm;
	}
}
