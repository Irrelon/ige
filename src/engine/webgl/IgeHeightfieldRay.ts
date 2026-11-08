export interface IgeRay {
	origin: { x: number; y: number; z: number };
	direction: { x: number; y: number; z: number };
}

export interface IgeHeightfieldRayOptions {
	/** Lowest ground height anywhere in the heightfield. */
	minHeight: number;
	/** Highest ground height anywhere in the heightfield. */
	maxHeight: number;
	/**
	 * Horizontal distance between samples in world units (default: 1/256
	 * of the band crossing). Small enough not to jump over narrow peaks.
	 */
	step?: number;
}

/**
 * Find where a ray first meets a heightfield. The ray is sampled through
 * the height band [minHeight, maxHeight], then the first crossing is
 * refined by bisection. Returns null if the ray misses the band or the
 * ground. Used by IgeWebGlRenderer.screenToHeightfield().
 * @param heightAt Ground height at a world X/Z position.
 */
export function intersectHeightfield (
	ray: IgeRay,
	heightAt: (x: number, z: number) => number,
	options: IgeHeightfieldRayOptions
): { x: number; y: number; z: number } | null {
	const o = ray.origin, d = ray.direction;
	const { minHeight, maxHeight } = options;

	// Ray parameters where it enters and leaves the height band
	let t0 = 0, t1: number;
	if (Math.abs(d.y) < 1e-9) {
		if (o.y < minHeight || o.y > maxHeight) return null;
		t1 = 1e6;
	} else {
		const ta = (maxHeight - o.y) / d.y;
		const tb = (minHeight - o.y) / d.y;
		t0 = Math.max(0, Math.min(ta, tb));
		t1 = Math.max(ta, tb);
		if (t1 < 0) return null;
	}

	const horizontal = Math.max(Math.hypot(d.x, d.z), 1e-6);
	const step = (options.step ?? Math.max(((t1 - t0) * horizontal) / 256, 1e-3)) / horizontal;
	const below = (t: number) => o.y + d.y * t <= heightAt(o.x + d.x * t, o.z + d.z * t);

	if (below(t0)) {
		return { x: o.x + d.x * t0, y: o.y + d.y * t0, z: o.z + d.z * t0 };
	}

	let previous = t0;
	for (let t = t0 + step; ; t += step) {
		const sample = Math.min(t, t1);
		if (below(sample)) {
			// Bisect between the last point above ground and this one
			let lo = previous, hi = sample;
			for (let i = 0; i < 12; i++) {
				const mid = (lo + hi) / 2;
				if (below(mid)) hi = mid;
				else lo = mid;
			}
			const x = o.x + d.x * hi, z = o.z + d.z * hi;
			return { x, y: heightAt(x, z), z };
		}
		previous = sample;
		if (sample >= t1) break;
	}

	return null;
}
