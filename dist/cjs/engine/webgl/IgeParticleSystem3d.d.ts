import { IgeEntity } from "../core/IgeEntity.js"
import type { IgeTexture } from "../core/IgeTexture.js";
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
/** Floats per particle in renderData(): x, y, z, size, r, g, b, a. */
export declare const PARTICLE_INSTANCE_FLOATS = 8;
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
export declare class IgeParticleSystem3d extends IgeEntity {
    classId: string;
    /** Marker the renderer uses to recognise particle systems. */
    readonly _isParticleSystem3d = true;
    _options: IgeParticleSystem3dOptions;
    _emitting: boolean;
    _emitAccumulator: number;
    _liveCount: number;
    _particlePosition: Float32Array;
    _particleVelocity: Float32Array;
    _particleAge: Float32Array;
    _particleLife: Float32Array;
    /** Packed per-particle render data, rebuilt each update. */
    _renderData: Float32Array;
    /** Incremented whenever _renderData changes (renderer upload check). */
    _renderVersion: number;
    /** World-space bounding sphere of the live particles (for culling). */
    _boundsCenter: IgeParticleVec3;
    _boundsRadius: number;
    constructor(options?: Partial<IgeParticleSystem3dOptions>);
    /**
     * Gets / sets options at runtime (e.g. change colour or rate).
     * Changing maxParticles after construction has no effect.
     */
    options(): IgeParticleSystem3dOptions;
    options(options: Partial<IgeParticleSystem3dOptions>): this;
    /** Resume continuous emission (if rate > 0). */
    start(): this;
    /** Stop continuous emission; live particles finish their lives. */
    stop(): this;
    /** Number of live particles. */
    particleCount(): number;
    /** Remove all live particles immediately. */
    clear(): this;
    /**
     * Emit a number of particles at once.
     * @param count How many particles to emit.
     * @param position World-space position (defaults to the emitter's position).
     * @param direction World-space direction (defaults to the configured direction).
     */
    burst(count: number, position?: IgeParticleVec3, direction?: IgeParticleVec3): this;
    update(tickDelta: number): void;
    /**
     * Returns the packed render data and live particle count. Each particle
     * uses PARTICLE_INSTANCE_FLOATS floats: x, y, z, size, r, g, b, a.
     */
    renderData(): {
        data: Float32Array;
        count: number;
    };
    _emitterWorldPosition(): IgeParticleVec3;
    _spawn(origin: IgeParticleVec3, direction: IgeParticleVec3): boolean;
    _simulate(dt: number): void;
    _buildRenderData(): void;
}
