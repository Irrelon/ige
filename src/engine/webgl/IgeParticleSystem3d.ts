import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeTexture } from "@/engine/core/IgeTexture";

export interface IgeParticleVec3 {
	x: number;
	y: number;
	z: number;
}

export interface IgeParticleColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

/**
 * Settings for IgeParticleSystem3d. Ranges are [min, max] and each new
 * particle picks a random value between them.
 */
export interface IgeParticleSystem3dOptions {
	/** Maximum live particles (default 512). Extra spawns are dropped. */
	maxParticles: number;
	/** Particle texture; defaults to a soft round dot. */
	texture?: IgeTexture;
	/** "additive" (fire, sparks, magic; default) or "normal" alpha blending. */
	blending: "additive" | "normal";
	/** Continuous emission in particles per second (0 = bursts only). */
	rate: number;
	/** Lifetime in seconds. */
	lifetime: [number, number];
	/** Initial speed in world units per second. */
	speed: [number, number];
	/** Emission direction in world space (normalised internally). */
	direction: IgeParticleVec3;
	/** Cone half-angle in radians around the direction (Math.PI = all directions). */
	spread: number;
	/** Constant acceleration in world units per second squared. */
	gravity: IgeParticleVec3;
	/** Fraction of velocity lost per second (0 = none, 1 = stops within a second). */
	drag: number;
	/** Size in world units at birth and at death. */
	size: [number, number];
	/** Colour at birth and at death (alpha fades with it). */
	startColor: IgeParticleColor;
	endColor: IgeParticleColor;
	/** Particles spawn at a random point within this radius of the emitter. */
	emitterRadius: number;
	/**
	 * When true (default), particles stay where they were emitted as the
	 * emitter moves (trails, blood); when false they move with the emitter.
	 */
	worldSpace: boolean;
}

const DEFAULT_OPTIONS: IgeParticleSystem3dOptions = {
	maxParticles: 512,
	blending: "additive",
	rate: 0,
	lifetime: [0.6, 1.2],
	speed: [50, 120],
	direction: { x: 0, y: 1, z: 0 },
	spread: Math.PI / 6,
	gravity: { x: 0, y: -200, z: 0 },
	drag: 0,
	size: [20, 5],
	startColor: { r: 1, g: 0.8, b: 0.3, a: 1 },
	endColor: { r: 1, g: 0.2, b: 0, a: 0 },
	emitterRadius: 0,
	worldSpace: true
};

/** Floats per particle in renderData(): x, y, z, size, r, g, b, a. */
export const PARTICLE_INSTANCE_FLOATS = 8;

/**
 * A lightweight 3D particle effect for the WebGL renderer: blood, sparks,
 * dust, fire, spell effects, muzzle flashes.
 *
 * Particles are simulated in flat typed arrays (no entity per particle)
 * and drawn as camera-facing quads with a single instanced draw call per
 * viewport, so effects with hundreds of particles stay cheap even in
 * split screen.
 *
 * @example #Blood spray when a zombie is hit
 *     const blood = new IgeParticleSystem3d({
 *         blending: "normal",
 *         speed: [80, 220],
 *         spread: Math.PI / 3,
 *         gravity: { x: 0, y: -600, z: 0 },
 *         size: [10, 4],
 *         startColor: { r: 0.6, g: 0, b: 0, a: 1 },
 *         endColor: { r: 0.3, g: 0, b: 0, a: 0 }
 *     }).mount(scene);
 *
 *     blood.burst(40, { x: zombie._translate.x, y: 120, z: zombie._translate.z });
 *
 * @example #A continuous torch flame attached to an entity
 *     new IgeParticleSystem3d({ rate: 60, speed: [20, 60], gravity: { x: 0, y: 80, z: 0 } })
 *         .translateTo(0, 150, 0)
 *         .mount(torchEntity);
 */
export class IgeParticleSystem3d extends IgeEntity {
	classId = "IgeParticleSystem3d";

	/** Marker the renderer uses to recognise particle systems. */
	readonly _isParticleSystem3d = true;

	_options: IgeParticleSystem3dOptions;
	_emitting: boolean = true;
	_emitAccumulator: number = 0;
	_liveCount: number = 0;

	_particlePosition: Float32Array;
	_particleVelocity: Float32Array;
	_particleAge: Float32Array;
	_particleLife: Float32Array;

	/** Packed per-particle render data, rebuilt each update. */
	_renderData: Float32Array;
	/** Incremented whenever _renderData changes (renderer upload check). */
	_renderVersion: number = 0;

	/** World-space bounding sphere of the live particles (for culling). */
	_boundsCenter: IgeParticleVec3 = { x: 0, y: 0, z: 0 };
	_boundsRadius: number = 0;

	constructor (options: Partial<IgeParticleSystem3dOptions> = {}) {
		super();
		this._options = {
			...DEFAULT_OPTIONS,
			...options,
			direction: { ...DEFAULT_OPTIONS.direction, ...(options.direction || {}) },
			gravity: { ...DEFAULT_OPTIONS.gravity, ...(options.gravity || {}) },
			startColor: { ...DEFAULT_OPTIONS.startColor, ...(options.startColor || {}) },
			endColor: { ...DEFAULT_OPTIONS.endColor, ...(options.endColor || {}) }
		};

		const max = this._options.maxParticles;
		this._particlePosition = new Float32Array(max * 3);
		this._particleVelocity = new Float32Array(max * 3);
		this._particleAge = new Float32Array(max);
		this._particleLife = new Float32Array(max);
		this._renderData = new Float32Array(max * PARTICLE_INSTANCE_FLOATS);

		// Particle systems never cast shadows
		this._noShadowCast = true;
	}

	/**
	 * Gets / sets options at runtime (e.g. change colour or rate).
	 * Changing maxParticles after construction has no effect.
	 */
	options (): IgeParticleSystem3dOptions;
	options (options: Partial<IgeParticleSystem3dOptions>): this;
	options (options?: Partial<IgeParticleSystem3dOptions>) {
		if (options === undefined) {
			return this._options;
		}

		this._options = {
			...this._options,
			...options,
			maxParticles: this._options.maxParticles
		};
		return this;
	}

	/** Resume continuous emission (if rate > 0). */
	start (): this {
		this._emitting = true;
		return this;
	}

	/** Stop continuous emission; live particles finish their lives. */
	stop (): this {
		this._emitting = false;
		return this;
	}

	/** Number of live particles. */
	particleCount (): number {
		return this._liveCount;
	}

	/** Remove all live particles immediately. */
	clear (): this {
		this._liveCount = 0;
		this._renderVersion++;
		return this;
	}

	/**
	 * Emit a number of particles at once.
	 * @param count How many particles to emit.
	 * @param position World-space position (defaults to the emitter's position).
	 * @param direction World-space direction (defaults to the configured direction).
	 */
	burst (count: number, position?: IgeParticleVec3, direction?: IgeParticleVec3): this {
		const origin = position || this._emitterWorldPosition();
		for (let i = 0; i < count; i++) {
			if (!this._spawn(origin, direction || this._options.direction)) break;
		}
		return this;
	}

	update (tickDelta: number) {
		super.update(tickDelta);
		this._simulate(Math.min(tickDelta / 1000, 0.1));
	}

	/**
	 * Returns the packed render data and live particle count. Each particle
	 * uses PARTICLE_INSTANCE_FLOATS floats: x, y, z, size, r, g, b, a.
	 */
	renderData (): { data: Float32Array; count: number } {
		return { data: this._renderData, count: this._liveCount };
	}

	_emitterWorldPosition (): IgeParticleVec3 {
		const m = this._worldMatrix4?.matrix;
		if (m) return { x: m[12], y: m[13], z: m[14] };
		return { x: this._translate.x, y: this._translate.y, z: this._translate.z };
	}

	_spawn (origin: IgeParticleVec3, direction: IgeParticleVec3): boolean {
		const o = this._options;
		if (this._liveCount >= o.maxParticles) return false;

		const i = this._liveCount++;
		const p3 = i * 3;

		// Position: origin plus a random point inside the emitter sphere
		let px = origin.x, py = origin.y, pz = origin.z;
		if (o.emitterRadius > 0) {
			const r = o.emitterRadius * Math.cbrt(Math.random());
			const d = randomUnitVector();
			px += d.x * r;
			py += d.y * r;
			pz += d.z * r;
		}

		// When simulating in local space, store positions relative to the emitter
		if (!o.worldSpace) {
			const e = this._emitterWorldPosition();
			px -= e.x;
			py -= e.y;
			pz -= e.z;
		}

		this._particlePosition[p3] = px;
		this._particlePosition[p3 + 1] = py;
		this._particlePosition[p3 + 2] = pz;

		// Velocity: random direction within the cone around `direction`
		const dir = randomDirectionInCone(direction, o.spread);
		const speed = lerp(o.speed[0], o.speed[1], Math.random());
		this._particleVelocity[p3] = dir.x * speed;
		this._particleVelocity[p3 + 1] = dir.y * speed;
		this._particleVelocity[p3 + 2] = dir.z * speed;

		this._particleAge[i] = 0;
		this._particleLife[i] = Math.max(0.001, lerp(o.lifetime[0], o.lifetime[1], Math.random()));
		return true;
	}

	_simulate (dt: number) {
		const o = this._options;

		// Continuous emission
		if (this._emitting && o.rate > 0 && dt > 0) {
			this._emitAccumulator += o.rate * dt;
			const toEmit = Math.floor(this._emitAccumulator);
			if (toEmit > 0) {
				this._emitAccumulator -= toEmit;
				this.burst(toEmit);
			}
		}

		const pos = this._particlePosition;
		const vel = this._particleVelocity;
		const age = this._particleAge;
		const life = this._particleLife;
		const gx = o.gravity.x * dt, gy = o.gravity.y * dt, gz = o.gravity.z * dt;
		const dragFactor = o.drag > 0 ? Math.max(0, 1 - o.drag * dt) : 1;

		// Age, integrate and remove dead particles (swap with the last live one)
		let i = 0;
		while (i < this._liveCount) {
			age[i] += dt;
			if (age[i] >= life[i]) {
				const last = --this._liveCount;
				if (i !== last) {
					pos[i * 3] = pos[last * 3];
					pos[i * 3 + 1] = pos[last * 3 + 1];
					pos[i * 3 + 2] = pos[last * 3 + 2];
					vel[i * 3] = vel[last * 3];
					vel[i * 3 + 1] = vel[last * 3 + 1];
					vel[i * 3 + 2] = vel[last * 3 + 2];
					age[i] = age[last];
					life[i] = life[last];
				}
				continue;
			}

			const p3 = i * 3;
			vel[p3] = (vel[p3] + gx) * dragFactor;
			vel[p3 + 1] = (vel[p3 + 1] + gy) * dragFactor;
			vel[p3 + 2] = (vel[p3 + 2] + gz) * dragFactor;
			pos[p3] += vel[p3] * dt;
			pos[p3 + 1] += vel[p3 + 1] * dt;
			pos[p3 + 2] += vel[p3 + 2] * dt;
			i++;
		}

		this._buildRenderData();
	}

	_buildRenderData () {
		const o = this._options;
		const out = this._renderData;
		const pos = this._particlePosition;
		const sc = o.startColor, ec = o.endColor;
		const offset = o.worldSpace ? { x: 0, y: 0, z: 0 } : this._emitterWorldPosition();

		let minX = Infinity, minY = Infinity, minZ = Infinity;
		let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
		let maxSize = 0;

		for (let i = 0; i < this._liveCount; i++) {
			const t = this._particleAge[i] / this._particleLife[i];
			const o8 = i * PARTICLE_INSTANCE_FLOATS;
			const x = pos[i * 3] + offset.x;
			const y = pos[i * 3 + 1] + offset.y;
			const z = pos[i * 3 + 2] + offset.z;
			const size = lerp(o.size[0], o.size[1], t);

			out[o8] = x;
			out[o8 + 1] = y;
			out[o8 + 2] = z;
			out[o8 + 3] = size;
			out[o8 + 4] = lerp(sc.r, ec.r, t);
			out[o8 + 5] = lerp(sc.g, ec.g, t);
			out[o8 + 6] = lerp(sc.b, ec.b, t);
			out[o8 + 7] = lerp(sc.a, ec.a, t);

			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (z < minZ) minZ = z;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
			if (z > maxZ) maxZ = z;
			if (size > maxSize) maxSize = size;
		}

		if (this._liveCount > 0) {
			const c = this._boundsCenter;
			c.x = (minX + maxX) / 2;
			c.y = (minY + maxY) / 2;
			c.z = (minZ + maxZ) / 2;
			const dx = maxX - c.x, dy = maxY - c.y, dz = maxZ - c.z;
			this._boundsRadius = Math.sqrt(dx * dx + dy * dy + dz * dz) + maxSize;
		} else {
			this._boundsRadius = 0;
		}

		this._renderVersion++;
	}
}

function lerp (a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function randomUnitVector (): IgeParticleVec3 {
	const z = Math.random() * 2 - 1;
	const a = Math.random() * Math.PI * 2;
	const r = Math.sqrt(1 - z * z);
	return { x: r * Math.cos(a), y: r * Math.sin(a), z };
}

/**
 * Uniformly distributed direction within a cone of half-angle `spread`
 * around `axis`.
 */
function randomDirectionInCone (axis: IgeParticleVec3, spread: number): IgeParticleVec3 {
	let ax = axis.x, ay = axis.y, az = axis.z;
	const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
	ax /= len;
	ay /= len;
	az /= len;

	if (spread <= 0) return { x: ax, y: ay, z: az };

	// Sample around +Z, then rotate +Z onto the axis
	const cosMax = Math.cos(Math.min(spread, Math.PI));
	const cosTheta = 1 - Math.random() * (1 - cosMax);
	const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
	const phi = Math.random() * Math.PI * 2;
	const lx = sinTheta * Math.cos(phi);
	const ly = sinTheta * Math.sin(phi);
	const lz = cosTheta;

	// Orthonormal basis (t, b, axis)
	const tx0 = Math.abs(ax) < 0.9 ? 1 : 0;
	const ty0 = Math.abs(ax) < 0.9 ? 0 : 1;
	// t = normalize(cross(helper, axis))
	let tx = ty0 * az - 0 * ay;
	let ty = 0 * ax - tx0 * az;
	let tz = tx0 * ay - ty0 * ax;
	const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
	tx /= tl;
	ty /= tl;
	tz /= tl;
	// b = cross(axis, t)
	const bx = ay * tz - az * ty;
	const by = az * tx - ax * tz;
	const bz = ax * ty - ay * tx;

	return {
		x: tx * lx + bx * ly + ax * lz,
		y: ty * lx + by * ly + ay * lz,
		z: tz * lx + bz * ly + az * lz
	};
}
