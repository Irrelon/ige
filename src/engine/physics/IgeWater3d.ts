/*
 * Water: a level and a few summed waves, as one function of position and
 * time. It depends on nothing else (no physics engine, no renderer), so
 * the same options give the same surface everywhere: buoyancy in
 * IgePhysics3d, the drawn sea, a game server and every client. Send the
 * options (plain JSON) and keep the clocks together with time(), and boats
 * ride the waves that are drawn on every machine.
 *
 * Distances are IGE units, speeds IGE units per second, time seconds,
 * directions degrees.
 */

/** One train of waves (summed with the others). */
export interface IgeWaterWave {
	/** The way the waves travel, in degrees: 0 along +Z, 90 along +X. */
	direction: number;
	/** Crest to crest, IGE units. */
	length: number;
	/** A crest's height above the level, IGE units. */
	amplitude: number;
	/**
	 * 0..1: 0 a rounded swell (a sine), towards 1 sharper crests and flatter
	 * troughs (Gerstner waves: the surface also moves to and fro). Default
	 * 0.5. Over all the waves together, keep it under 1.
	 */
	steepness?: number;
	/** IGE units per second (default: deep water's, about 1.25 m/s times the square root of the length in metres). */
	speed?: number;
	/** Radians, to start waves out of step with each other (default 0). */
	phase?: number;
}

/** A stretch of water (a box seen from above). Outside every region there's no water. */
export interface IgeWaterRegion {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
	/** Its own level (a lake or river above the sea), default the water's. */
	level?: number;
	/** How much of the waves it has, 0 (flat: a pond, a dock) to 1 (default). */
	waves?: number;
	/** Its own current, IGE units per second (default the water's). */
	current?: { x: number; z: number };
}

export interface IgeWaterOptions {
	/** Height of the still surface, IGE units (default 0). */
	level?: number;
	/** Waves summed on the level (default none: flat water). */
	waves?: IgeWaterWave[];
	/** The water's flow, IGE units per second: floating things drift with it (default none). */
	current?: { x: number; z: number };
	/** Where there is water (default: everywhere). The first region holding a point wins. */
	regions?: IgeWaterRegion[];
	/** kg per cubic metre (default 1025, sea water; 1000 for fresh). */
	density?: number;
}

interface ResolvedWave {
	/** Unit direction. */
	dx: number;
	dz: number;
	/** Wave number (radians per IGE unit) and angular speed (radians per second). */
	k: number;
	omega: number;
	amplitude: number;
	/** Horizontal sway (Gerstner): steepness / (k * waves). */
	sway: number;
	phase: number;
}

const EMPTY_CURRENT = { x: 0, z: 0 };

/**
 * A body of water. heightAt() is the surface at a place and time; the
 * renderer draws a grid with surfaceAt(); IgePhysics3d floats boats and
 * crates on it (physics.water(options) makes one and keeps its clock).
 * @example #A sea with a long swell and a short chop
 *     const water = new IgeWater3d({
 *         level: 0,
 *         waves: [
 *             { direction: 20, length: 6000, amplitude: 40, steepness: 0.4 },
 *             { direction: 70, length: 1800, amplitude: 12, steepness: 0.5, phase: 1 }
 *         ]
 *     });
 *     const y = water.heightAt(x, z, seconds);
 */
export class IgeWater3d {
	classId = "IgeWater3d";
	readonly level: number;
	readonly density: number;
	readonly unitsPerMetre: number;
	_options: IgeWaterOptions;
	_waves: ResolvedWave[];
	_regions: IgeWaterRegion[] | null;
	_current: { x: number; z: number };
	_time: number = 0;

	/** unitsPerMetre (default 100) sets the waves' default speeds (deep water's). */
	constructor (options: IgeWaterOptions = {}, unitsPerMetre: number = 100) {
		this._options = JSON.parse(JSON.stringify(options));
		this.level = options.level ?? 0;
		this.density = options.density ?? 1025;
		this.unitsPerMetre = unitsPerMetre;
		this._current = options.current ? { x: options.current.x, z: options.current.z } : EMPTY_CURRENT;
		this._regions = options.regions?.length ? options.regions.map((r) => ({ ...r })) : null;
		const waves = options.waves || [];
		const count = Math.max(1, waves.length);
		this._waves = waves.map((wave) => {
			const length = Math.max(1e-6, wave.length);
			const k = (2 * Math.PI) / length;
			// Deep water: c = sqrt(g / k) in metres
			const speed = wave.speed ?? Math.sqrt(9.81 / (k * unitsPerMetre)) * unitsPerMetre;
			const angle = (wave.direction * Math.PI) / 180;
			const steepness = Math.max(0, Math.min(1, wave.steepness ?? 0.5));
			return {
				dx: Math.sin(angle),
				dz: Math.cos(angle),
				k,
				omega: k * speed,
				amplitude: wave.amplitude,
				sway: wave.amplitude > 0 ? steepness / (k * count) : 0,
				phase: wave.phase ?? 0
			};
		});
	}

	/** The options it was made with (plain JSON: send them to clients to make the same water). */
	options (): IgeWaterOptions {
		return JSON.parse(JSON.stringify(this._options));
	}

	/**
	 * Gets / sets the water's clock (seconds). IgePhysics3d moves it on with
	 * every step; set it from a shared clock (the server's) so every machine
	 * has the same waves.
	 */
	time (): number;
	time (seconds: number): this;
	time (seconds?: number): number | this {
		if (seconds === undefined) return this._time;
		this._time = seconds;
		return this;
	}

	/** The region holding a point, or null when the point is over no water (only with regions). */
	_region (x: number, z: number): IgeWaterRegion | null | undefined {
		const regions = this._regions;
		if (!regions) return undefined;
		for (const region of regions) {
			if (x >= region.minX && x <= region.maxX && z >= region.minZ && z <= region.maxZ) return region;
		}
		return null;
	}

	/** Whether there's water at a place (seen from above). */
	inWater (x: number, z: number): boolean {
		return this._region(x, z) !== null;
	}

	/** The still level at a place (-Infinity where there's no water). */
	levelAt (x: number, z: number): number {
		const region = this._region(x, z);
		if (region === null) return -Infinity;
		return region?.level ?? this.level;
	}

	/** The current at a place, IGE units per second. */
	currentAt (x: number, z: number, out: { x: number; z: number } = { x: 0, z: 0 }): { x: number; z: number } {
		const region = this._region(x, z);
		const current = region?.current ?? this._current;
		out.x = region === null ? 0 : current.x;
		out.z = region === null ? 0 : current.z;
		return out;
	}

	/**
	 * Where the surface point that rests at (x0, z0) is at time t: it sways
	 * to and fro (with steepness) and rises and falls. For drawing a grid:
	 * each vertex is a rest point. Fills `out` (x, y, z) and returns it.
	 */
	surfaceAt (x0: number, z0: number, t: number = this._time, out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }, normal?: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
		const region = this._region(x0, z0);
		if (region === null) {
			out.x = x0; out.y = -Infinity; out.z = z0;
			if (normal) { normal.x = 0; normal.y = 1; normal.z = 0; }
			return out;
		}
		const scale = region?.waves ?? 1;
		const level = region?.level ?? this.level;
		let x = x0, y = level, z = z0;
		// Tangents along x0 and z0 (for the normal)
		let ax = 1, ay = 0, az = 0, bx = 0, by = 0, bz = 1;
		if (scale > 0) {
			for (const w of this._waves) {
				const theta = w.k * (w.dx * x0 + w.dz * z0) - w.omega * t + w.phase;
				const s = Math.sin(theta), c = Math.cos(theta);
				const a = w.amplitude * scale, sway = w.sway * scale;
				x += sway * w.dx * c;
				z += sway * w.dz * c;
				y += a * s;
				if (normal) {
					const swayK = sway * w.k * s, ak = a * w.k * c;
					ax -= swayK * w.dx * w.dx; ay += ak * w.dx; az -= swayK * w.dx * w.dz;
					bx -= swayK * w.dx * w.dz; by += ak * w.dz; bz -= swayK * w.dz * w.dz;
				}
			}
		}
		out.x = x; out.y = y; out.z = z;
		if (normal) {
			// b x a points up
			const nx = by * az - bz * ay, ny = bz * ax - bx * az, nz = bx * ay - by * ax;
			const len = Math.hypot(nx, ny, nz) || 1;
			normal.x = nx / len; normal.y = ny / len; normal.z = nz / len;
		}
		return out;
	}

	/**
	 * The surface's height at a place and time (default: the water's own
	 * clock). -Infinity where there's no water. With steep waves the
	 * surface sways sideways too, so this finds the rest point that sways
	 * to (x, z) first (a few quick iterations).
	 */
	heightAt (x: number, z: number, t: number = this._time): number {
		const region = this._region(x, z);
		if (region === null) return -Infinity;
		const scale = region?.waves ?? 1;
		const level = region?.level ?? this.level;
		const waves = this._waves;
		if (!waves.length || scale <= 0) return level;

		// Find the rest point (x0, z0) whose surface point is above (x, z)
		let x0 = x, z0 = z;
		for (let i = 0; i < 4; i++) {
			let sx = 0, sz = 0;
			for (const w of waves) {
				if (!w.sway) continue;
				const c = Math.cos(w.k * (w.dx * x0 + w.dz * z0) - w.omega * t + w.phase) * w.sway * scale;
				sx += w.dx * c;
				sz += w.dz * c;
			}
			const nx = x - sx, nz = z - sz;
			const moved = Math.abs(nx - x0) + Math.abs(nz - z0);
			x0 = nx; z0 = nz;
			if (moved < 1e-3) break;
		}
		let y = level;
		for (const w of waves) y += Math.sin(w.k * (w.dx * x0 + w.dz * z0) - w.omega * t + w.phase) * w.amplitude * scale;
		return y;
	}

	/** The surface's normal at a place and time (straight up where there's no water). */
	normalAt (x: number, z: number, t: number = this._time, out: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 }): { x: number; y: number; z: number } {
		// From the heights a short step either side
		const d = this.unitsPerMetre * 0.25;
		const hx = this.heightAt(x + d, z, t) - this.heightAt(x - d, z, t);
		const hz = this.heightAt(x, z + d, t) - this.heightAt(x, z - d, t);
		if (!Number.isFinite(hx) || !Number.isFinite(hz)) {
			out.x = 0; out.y = 1; out.z = 0;
			return out;
		}
		const nx = 0 - hx, ny = 2 * d, nz = 0 - hz;
		const len = Math.hypot(nx, ny, nz);
		out.x = nx / len; out.y = ny / len; out.z = nz / len;
		return out;
	}

	/** The highest the surface can reach anywhere (the level plus every wave's amplitude): a bound for culling or skipping work. */
	maxHeight (): number {
		let level = this.level;
		for (const region of this._regions || []) level = Math.max(level, region.level ?? this.level);
		return level + this._waves.reduce((sum, w) => sum + Math.abs(w.amplitude), 0);
	}

	/** Move the clock on (IgePhysics3d calls this after every step). */
	_advance (dt: number): void {
		this._time += dt;
	}
}
