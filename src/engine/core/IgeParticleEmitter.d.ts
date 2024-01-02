import type { IgeObject } from "./IgeObject";
import type { IgeParticle } from "./IgeParticle";
import type { IgePoint3d } from "./IgePoint3d";
import { IgeUiEntity } from "./IgeUiEntity";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export interface IgeParticleVectorBaseMinMax {
	base: IgePoint3d;
	min: IgePoint3d;
	max: IgePoint3d;
}
/**
 * Creates a new particle emitter.
 */
export declare class IgeParticleEmitter extends IgeUiEntity {
	classId: string;
	IgeParticleEmitter: boolean;
	_particle?: typeof IgeParticle;
	_currentDelta: number;
	_started: boolean;
	_particles: IgeParticle[];
	_particleMountTarget?: IgeObject;
	_applyDepthToParticles: boolean;
	_applyLayerToParticles: boolean;
	_quantityTimespan: number;
	_quantityBase: number;
	_quantityVariance: [number, number];
	_quantityMax: number;
	_quantityProduced: number;
	_translateBaseX: number;
	_translateBaseY: number;
	_translateBaseZ: number;
	_translateVarianceX: [number, number];
	_translateVarianceY: [number, number];
	_translateVarianceZ: [number, number];
	_rotateBase: number;
	_rotateVariance: [number, number];
	_deathRotateBase: number;
	_deathRotateVariance: [number, number];
	_scaleBaseX: number;
	_scaleBaseY: number;
	_scaleBaseZ: number;
	_scaleVarianceX: [number, number];
	_scaleVarianceY: [number, number];
	_scaleVarianceZ: [number, number];
	_scaleLockAspect: boolean;
	_deathScaleBaseX: number;
	_deathScaleBaseY: number;
	_deathScaleBaseZ: number;
	_deathScaleVarianceX: [number, number];
	_deathScaleVarianceY: [number, number];
	_deathScaleVarianceZ: [number, number];
	_deathScaleLockAspect: boolean;
	_opacityBase: number;
	_opacityVariance: [number, number];
	_deathOpacityBase: number;
	_deathOpacityVariance: [number, number];
	_lifeBase: number;
	_lifeVariance: [number, number];
	_velocityVector?: IgeParticleVectorBaseMinMax;
	_linearForceVector?: IgeParticleVectorBaseMinMax;
	_maxParticles: number;
	_particlesPerTimeVector: number;
	constructor();
	/**
	 * Sets the class that all particles emitted from this
	 * emitter will be created from.
	 * @param {IgeParticle} obj
	 * @return {*}
	 */
	particle(obj: typeof IgeParticle): this;
	particleMountTarget(obj: IgeObject): this;
	applyDepthToParticles(val: boolean): this;
	applyLayerToParticles(val: boolean): this;
	quantityTimespan(val: number): this;
	quantityBase(val: number): this;
	quantityVariance(a: number, b: number): this;
	quantityMax(val: number): this;
	translateBaseX(val: number): this;
	translateBaseY(val: number): this;
	translateBaseZ(val: number): this;
	translateVarianceX(a: number, b: number): this;
	translateVarianceY(a: number, b: number): this;
	translateVarianceZ(a: number, b: number): this;
	rotateBase(val: number): this;
	rotateVariance(a: number, b: number): this;
	deathRotateBase(val: number): this;
	deathRotateVariance(a: number, b: number): this;
	scaleBaseX(val: number): this;
	scaleBaseY(val: number): this;
	scaleBaseZ(val: number): this;
	scaleVarianceX(a: number, b: number): this;
	scaleVarianceY(a: number, b: number): this;
	scaleVarianceZ(a: number, b: number): this;
	scaleLockAspect(val: boolean): this;
	deathScaleBaseX(val: number): this;
	deathScaleBaseY(val: number): this;
	deathScaleBaseZ(val: number): this;
	deathScaleVarianceX(a: number, b: number): this;
	deathScaleVarianceY(a: number, b: number): this;
	deathScaleVarianceZ(a: number, b: number): this;
	deathScaleLockAspect(val: boolean): this;
	opacityBase(val: number): this;
	opacityVariance(a: number, b: number): this;
	deathOpacityBase(val: number): this;
	deathOpacityVariance(a: number, b: number): this;
	lifeBase(val: number): this;
	lifeVariance(a: number, b: number): this;
	/**
	 * Sets the base velocity vector of each emitted particle and optionally
	 * the min and max vectors that are used to randomize the resulting particle
	 * velocity vector.
	 * @param {IgePoint3d} baseVector The base vector.
	 * @param {IgePoint3d} minVector The minimum vector.
	 * @param {IgePoint3d} maxVector The maximum vector.
	 */
	velocityVector(baseVector: IgePoint3d, minVector: IgePoint3d, maxVector: IgePoint3d): this;
	/**
	 * Sets the base linear force vector of each emitted particle and optionally
	 * the min and max vectors that are used to randomize the resulting particle
	 * linear force vector.
	 * @param {IgePoint3d} baseVector The base vector.
	 * @param {IgePoint3d} minVector The minimum vector.
	 * @param {IgePoint3d} maxVector The maximum vector.
	 */
	linearForceVector(baseVector: IgePoint3d, minVector: IgePoint3d, maxVector: IgePoint3d): this;
	/**
	 * Starts the particle emitter which will begin spawning
	 * particle entities based upon the emitter's current settings.
	 * @return {*}
	 */
	start(): this;
	updateSettings(): void;
	/**
	 * Stops the particle emitter. The current particles will
	 * continue to process until they reach their natural lifespan.
	 * @return {*}
	 */
	stop(): this;
	/**
	 * Stops the particle emitter. The current particles will be
	 * destroyed immediately.
	 * @return {*}
	 */
	stopAndKill(): this;
	/**
	 * Takes a base value and a variance range and returns a random
	 * value between the range, added to the base.
	 * @param {number} base The base value.
	 * @param {Array} variance An array containing the two values of
	 * the variance range.
	 * @param {boolean} floorIt If set to true, will cause the returned
	 * value to be passed through Math.floor().
	 * @return {number} Returns the final value based upon the base
	 * value and variance range.
	 */
	baseAndVarianceValue(base: number, variance: [number, number], floorIt?: boolean): any;
	vectorFromBaseMinMax(vectorData: IgeParticleVectorBaseMinMax): IgePoint3d;
	/**
	 * Creates and maintains the particles that this emitter is
	 * responsible for spawning and controlling.
	 * @param ctx
	 */
	tick(ctx: IgeCanvasRenderingContext2d): void;
	/**
	 * Returns an array of the current particle entities that this
	 * emitter has spawned.
	 * @return {Array} The array of particle entities the emitter spawned.
	 */
	particles(): IgeParticle[];
}
