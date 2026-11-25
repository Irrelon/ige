import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeBreakResult, IgeBreakables3d } from "@/engine/physics/IgeBreakable3d";
import type { IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { IgeParticleSystem3d, type IgeParticleSystem3dOptions } from "@/engine/webgl/IgeParticleSystem3d";

export interface IgeBreakableEffects3dOptions {
	/** A decal system for marks on the ground where things break (scuffs, dust). */
	decals?: IgeDecalSystem3d;
	/** The ground's height under a point, for decals (default 0). */
	groundAt?: (x: number, z: number) => number;
	/** Particles per break, times this (default 1). */
	amount?: number;
	/** IGE units per metre, to size the effects (default 100). */
	unitsPerMetre?: number;
	/** Your own particle settings per effect name, over the built-in ones. */
	particles?: Record<string, Partial<IgeParticleSystem3dOptions>>;
}

/**
 * Effects for breaking props: splinters for wood, dust for concrete,
 * sparkling shards for glass, chips for plastic, sparks for metal. It
 * listens to a world's breakables and bursts particles at each break (more
 * for harder hits), with a mark on the ground when given a decal system.
 * The effect comes from the breakable's material (IgeBreakableMaterial
 * .effect); "break" events carry everything to do your own instead.
 * @example #Splinters, dust and glass for every break
 *     const effects = new IgeBreakableEffects3d(physics.breakables, scene, { decals });
 */
export class IgeBreakableEffects3d {
	readonly breakables: IgeBreakables3d;
	_systems: Map<string, IgeParticleSystem3d> = new Map();
	_parent: IgeEntity;
	_options: IgeBreakableEffects3dOptions;
	_listener: (result: IgeBreakResult) => void;

	constructor (breakables: IgeBreakables3d, parent: IgeEntity, options: IgeBreakableEffects3dOptions = {}) {
		this.breakables = breakables;
		this._parent = parent;
		this._options = options;
		this._listener = (result) => this.play(result);
		breakables.on("break", this._listener);
	}

	/** The particle settings for an effect, in IGE units. */
	_settings (effect: string): Partial<IgeParticleSystem3dOptions> {
		const m = (this._options.unitsPerMetre ?? 100) / 100;
		const builtIn: Record<string, Partial<IgeParticleSystem3dOptions>> = {
			splinters: {
				blending: "normal", maxParticles: 400, lifetime: [0.5, 1.2], speed: [150 * m, 520 * m], spread: Math.PI * 0.55,
				gravity: { x: 0, y: -900 * m, z: 0 }, drag: 0.4, size: [5 * m, 3 * m],
				startColor: { r: 0.85, g: 0.7, b: 0.48, a: 1 }, endColor: { r: 0.6, g: 0.45, b: 0.3, a: 0 }, emitterRadius: 12 * m
			},
			dust: {
				blending: "normal", maxParticles: 300, lifetime: [0.7, 1.5], speed: [40 * m, 150 * m], spread: Math.PI * 0.8,
				gravity: { x: 0, y: 10 * m, z: 0 }, drag: 1.8, size: [16 * m, 48 * m],
				startColor: { r: 0.62, g: 0.6, b: 0.56, a: 0.28 }, endColor: { r: 0.66, g: 0.64, b: 0.6, a: 0 }, emitterRadius: 18 * m
			},
			glass: {
				blending: "additive", maxParticles: 500, lifetime: [0.35, 0.9], speed: [120 * m, 480 * m], spread: Math.PI * 0.6,
				gravity: { x: 0, y: -800 * m, z: 0 }, drag: 0.3, size: [4 * m, 1.5 * m],
				startColor: { r: 0.85, g: 0.95, b: 1, a: 1 }, endColor: { r: 0.6, g: 0.8, b: 1, a: 0 }, emitterRadius: 15 * m
			},
			chips: {
				blending: "normal", maxParticles: 300, lifetime: [0.4, 1], speed: [120 * m, 420 * m], spread: Math.PI * 0.6,
				gravity: { x: 0, y: -900 * m, z: 0 }, drag: 0.3, size: [4 * m, 3 * m],
				startColor: { r: 0.95, g: 0.5, b: 0.15, a: 1 }, endColor: { r: 0.9, g: 0.85, b: 0.8, a: 0 }, emitterRadius: 8 * m
			},
			sparks: {
				blending: "additive", maxParticles: 300, lifetime: [0.2, 0.6], speed: [200 * m, 700 * m], spread: Math.PI * 0.5,
				gravity: { x: 0, y: -700 * m, z: 0 }, drag: 0.5, size: [3 * m, 1 * m],
				startColor: { r: 1, g: 0.85, b: 0.4, a: 1 }, endColor: { r: 1, g: 0.3, b: 0, a: 0 }, emitterRadius: 4 * m
			}
		};
		return { ...builtIn[effect], ...this._options.particles?.[effect] };
	}

	/** The particle system for an effect, made on first use. */
	system (effect: string): IgeParticleSystem3d | null {
		let system = this._systems.get(effect);
		if (system) return system;
		const settings = this._settings(effect);
		if (!settings.lifetime) return null; // "none", or unknown
		system = new IgeParticleSystem3d(settings);
		system.mount(this._parent);
		this._systems.set(effect, system);
		return system;
	}

	/** Burst the effects for a break (called for every "break"; call it yourself for replays elsewhere). */
	play (result: IgeBreakResult): void {
		const amount = (this._options.amount ?? 1) * Math.min(2.5, 0.7 + 0.3 * result.strength);
		const p = result.point;
		// Out of the prop, back towards what hit it, and upward a little
		const d = result.direction;
		const out = { x: -d.x * 0.6, y: 0.5, z: -d.z * 0.6 };
		const through = { x: d.x, y: 0.35, z: d.z };
		const effect = result.effect;
		const main = this.system(effect);
		if (main) {
			const count = Math.round((effect === "glass" ? 70 : effect === "dust" ? 26 : 45) * amount);
			main.burst(Math.round(count * 0.6), p, through);
			main.burst(Math.round(count * 0.4), p, out);
		}
		// Glass glints along its shards too; concrete and wood throw some dust
		if (effect === "glass" && main) {
			for (const piece of result.pieces.slice(0, 24)) main.burst(2, piece.entity._translate, through);
		}
		if (effect === "splinters") this.system("dust")?.burst(Math.round(5 * amount), p, out);

		const decals = this._options.decals;
		// A mark on the ground where concrete broke (a multiply decal can only darken, so not for glass or wood)
		if (decals && effect === "dust") {
			const y = this._options.groundAt?.(p.x, p.z) ?? 0;
			const m = (this._options.unitsPerMetre ?? 100) / 100;
			decals.add(p.x, p.z, { y, size: 110 * m * Math.min(1.6, amount), color: { r: 0.72, g: 0.7, b: 0.66 }, opacity: 0.35 });
		}
	}

	/** Stop listening and remove the particle systems. */
	destroy (): void {
		this.breakables.off("break", this._listener as any);
		for (const system of this._systems.values()) system.destroy();
		this._systems.clear();
	}
}
