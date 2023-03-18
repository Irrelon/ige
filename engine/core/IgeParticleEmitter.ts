import { ige } from "../instance";
import { IgeUiEntity } from "./IgeUiEntity";
import { IgeTween, IgeTweenPropertyObject } from "./IgeTween";
import { IgePoint3d } from "./IgePoint3d";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
import { IgeParticle } from "./IgeParticle";
import { IgeObject } from "./IgeObject";
import { degreesToRadians } from "../services/utils";
import { IgeVelocityComponent } from "../components/IgeVelocityComponent";

export interface IgeParticleVectorBaseMinMax {
	base: IgePoint3d;
	min: IgePoint3d;
	max: IgePoint3d;
}

/**
 * Creates a new particle emitter.
 */
export class IgeParticleEmitter extends IgeUiEntity {
	classId = "IgeParticleEmitter";
	IgeParticleEmitter = true;

	_particle?: typeof IgeParticle;

	_currentDelta: number;
	_started: boolean = false;
	_particles: IgeParticle[];
	_particleMountTarget?: IgeObject;
	_applyDepthToParticles: boolean = true;
	_applyLayerToParticles: boolean = true;
	_quantityTimespan: number = 1000;
	_quantityBase: number = 10;
	_quantityVariance: [number, number] = [0, 0];
	_quantityMax: number = 0; // Unlimited = 0
	_quantityProduced: number = 0;
	_translateBaseX: number = 0;
	_translateBaseY: number = 0;
	_translateBaseZ: number = 0;
	_translateVarianceX: [number, number] = [0, 0];
	_translateVarianceY: [number, number] = [0, 0];
	_translateVarianceZ: [number, number] = [0, 0];
	_rotateBase: number = 0;
	_rotateVariance: [number, number] = [0, 0];
	_deathRotateBase: number = 0;
	_deathRotateVariance: [number, number] = [0, 0];
	_scaleBaseX: number = 0;
	_scaleBaseY: number = 0;
	_scaleBaseZ: number = 0;
	_scaleVarianceX: [number, number] = [0, 0];
	_scaleVarianceY: [number, number] = [0, 0];
	_scaleVarianceZ: [number, number] = [0, 0];
	_scaleLockAspect: boolean = false;
	_deathScaleBaseX: number = 1;
	_deathScaleBaseY: number = 1;
	_deathScaleBaseZ: number = 1;
	_deathScaleVarianceX: [number, number] = [0, 0];
	_deathScaleVarianceY: [number, number] = [0, 0];
	_deathScaleVarianceZ: [number, number] = [0, 0];
	_deathScaleLockAspect: boolean = false;
	_opacityBase: number = 1;
	_opacityVariance: [number, number] = [0, 0];
	_deathOpacityBase: number = 1;
	_deathOpacityVariance: [number, number] = [0, 0];
	_lifeBase: number = 1000;
	_lifeVariance: [number, number] = [0, 0];
	_velocityVector?: IgeParticleVectorBaseMinMax;
	_linearForceVector?: IgeParticleVectorBaseMinMax;
	_maxParticles: number = 1;
	_particlesPerTimeVector: number = 1;

	constructor () {
		super();

		// Set some defaults
		this._currentDelta = 0;
		this._started = false;
		this._particles = [];

		this.applyDepthToParticles(true);
		this.applyLayerToParticles(true);
		this.quantityTimespan(1000);
		this.quantityBase(10);
		this.quantityVariance(0, 0);
		this.translateBaseX(0);
		this.translateBaseY(0);
		this.translateBaseZ(0);
		this.translateVarianceX(0, 0);
		this.translateVarianceY(0, 0);
		this.translateVarianceZ(0, 0);
		this.rotateBase(0);
		this.rotateVariance(0, 0);
		this.deathRotateBase(0);
		this.deathRotateVariance(0, 0);
		this.scaleBaseX(1);
		this.scaleBaseY(1);
		this.scaleBaseZ(1);
		this.scaleVarianceX(0, 0);
		this.scaleVarianceY(0, 0);
		this.scaleVarianceZ(0, 0);
		this.scaleLockAspect(false);
		this.deathScaleBaseX(0);
		this.deathScaleBaseY(0);
		this.deathScaleBaseZ(0);
		this.deathScaleVarianceX(0, 0);
		this.deathScaleVarianceY(0, 0);
		this.deathScaleVarianceZ(0, 0);
		this.deathScaleLockAspect(false);
		this.opacityBase(1);
		this.opacityVariance(0, 0);
		this.deathOpacityBase(1);
		this.deathOpacityVariance(0, 0);
		this.lifeBase(1000);
		this.lifeVariance(0, 0);
	}

	/**
	 * Sets the class that all particles emitted from this
	 * emitter will be created from.
	 * @param {IgeParticle} obj
	 * @return {*}
	 */
	particle (obj: typeof IgeParticle) {
		this._particle = obj;
		return this;
	}

	particleMountTarget (obj: IgeObject) {
		this._particleMountTarget = obj;
		return this;
	}

	applyDepthToParticles (val: boolean) {
		this._applyDepthToParticles = val;
		return this;
	}

	applyLayerToParticles (val: boolean) {
		this._applyLayerToParticles = val;
		return this;
	}

	quantityTimespan (val: number) {
		this._quantityTimespan = val;
		return this;
	}

	quantityBase (val: number) {
		this._quantityBase = val;
		return this;
	}

	quantityVariance (a: number, b: number) {
		this._quantityVariance = [a, b];
		return this;
	}

	quantityMax (val: number) {
		this._quantityMax = val;
		this._quantityProduced = 0;
		return this;
	}

	translateBaseX (val: number) {
		this._translateBaseX = val;
		return this;
	}

	translateBaseY (val: number) {
		this._translateBaseY = val;
		return this;
	}

	translateBaseZ (val: number) {
		this._translateBaseZ = val;
		return this;
	}

	translateVarianceX (a: number, b: number) {
		this._translateVarianceX = [a, b];
		return this;
	}

	translateVarianceY (a: number, b: number) {
		this._translateVarianceY = [a, b];
		return this;
	}

	translateVarianceZ (a: number, b: number) {
		this._translateVarianceZ = [a, b];
		return this;
	}

	rotateBase (val: number) {
		this._rotateBase = val;
		return this;
	}

	rotateVariance (a: number, b: number) {
		this._rotateVariance = [a, b];
		return this;
	}

	deathRotateBase (val: number) {
		this._deathRotateBase = val;
		return this;
	}

	deathRotateVariance (a: number, b: number) {
		this._deathRotateVariance = [a, b];
		return this;
	}

	scaleBaseX (val: number) {
		this._scaleBaseX = val;
		return this;
	}

	scaleBaseY (val: number) {
		this._scaleBaseY = val;
		return this;
	}

	scaleBaseZ (val: number) {
		this._scaleBaseZ = val;
		return this;
	}

	scaleVarianceX (a: number, b: number) {
		this._scaleVarianceX = [a, b];
		return this;
	}

	scaleVarianceY (a: number, b: number) {
		this._scaleVarianceY = [a, b];
		return this;
	}

	scaleVarianceZ (a: number, b: number) {
		this._scaleVarianceZ = [a, b];
		return this;
	}

	scaleLockAspect (val: boolean) {
		this._scaleLockAspect = val;
		return this;
	}

	deathScaleBaseX (val: number) {
		this._deathScaleBaseX = val;
		return this;
	}

	deathScaleBaseY (val: number) {
		this._deathScaleBaseY = val;
		return this;
	}

	deathScaleBaseZ (val: number) {
		this._deathScaleBaseZ = val;
		return this;
	}

	deathScaleVarianceX (a: number, b: number) {
		this._deathScaleVarianceX = [a, b];
		return this;
	}

	deathScaleVarianceY (a: number, b: number) {
		this._deathScaleVarianceY = [a, b];
		return this;
	}

	deathScaleVarianceZ (a: number, b: number) {
		this._deathScaleVarianceZ = [a, b];
		return this;
	}

	deathScaleLockAspect (val: boolean) {
		this._deathScaleLockAspect = val;
		return this;
	}

	opacityBase (val: number) {
		this._opacityBase = val;
		return this;
	}

	opacityVariance (a: number, b: number) {
		this._opacityVariance = [a, b];
		return this;
	}

	deathOpacityBase (val: number) {
		this._deathOpacityBase = val;
		return this;
	}

	deathOpacityVariance (a: number, b: number) {
		this._deathOpacityVariance = [a, b];
		return this;
	}

	lifeBase (val: number) {
		this._lifeBase = val;
		return this;
	}

	lifeVariance (a: number, b: number) {
		this._lifeVariance = [a, b];
		return this;
	}

	/**
	 * Sets the base velocity vector of each emitted particle and optionally
	 * the min and max vectors that are used to randomize the resulting particle
	 * velocity vector.
	 * @param {IgePoint3d} baseVector The base vector.
	 * @param {IgePoint3d} minVector The minimum vector.
	 * @param {IgePoint3d} maxVector The maximum vector.
	 */
	velocityVector (baseVector: IgePoint3d, minVector: IgePoint3d, maxVector: IgePoint3d) {
		this._velocityVector = {
			"base": baseVector,
			"min": minVector,
			"max": maxVector
		};

		return this;
	}

	/**
	 * Sets the base linear force vector of each emitted particle and optionally
	 * the min and max vectors that are used to randomize the resulting particle
	 * linear force vector.
	 * @param {IgePoint3d} baseVector The base vector.
	 * @param {IgePoint3d} minVector The minimum vector.
	 * @param {IgePoint3d} maxVector The maximum vector.
	 */
	linearForceVector (baseVector: IgePoint3d, minVector: IgePoint3d, maxVector: IgePoint3d) {
		this._linearForceVector = {
			"base": baseVector,
			"min": minVector,
			"max": maxVector
		};

		return this;
	}

	/**
	 * Starts the particle emitter which will begin spawning
	 * particle entities based upon the emitter's current settings.
	 * @return {*}
	 */
	start () {
		if (this._particle) {
			// Update the transform matrix before starting
			// otherwise some particles might read the old
			// matrix values if the start method was chained!
			this.updateTransform();

			this._quantityTimespan = this._quantityTimespan !== undefined ? this._quantityTimespan : 1000;
			this._maxParticles = this.baseAndVarianceValue(this._quantityBase, this._quantityVariance, true);
			this._particlesPerTimeVector = this._quantityTimespan / this._maxParticles; // 1 Particle every x milliseconds (x stored in this._particlesPerTimeVector)
			this._currentDelta = 0;

			// Set the emitter started flag
			this._quantityProduced = 0;
			this._started = true;
		} else {
			this.log("Cannot start particle emitter because no particle class was specified with a call to particle()", "error");
		}

		return this;
	}

	updateSettings () {
		this._maxParticles = this.baseAndVarianceValue(this._quantityBase, this._quantityVariance, true);
		this._particlesPerTimeVector = this._quantityTimespan / this._maxParticles; // 1 Particle every x milliseconds (x stored in this._particlesPerTimeVector)
	}

	/**
	 * Stops the particle emitter. The current particles will
	 * continue to process until they reach their natural lifespan.
	 * @return {*}
	 */
	stop () {
		this._started = false;
		return this;
	}

	/**
	 * Stops the particle emitter. The current particles will be
	 * destroyed immediately.
	 * @return {*}
	 */
	stopAndKill () {
		this._started = false;

		// Loop the particles array and destroy all the particles
		const arr = this._particles;
		let arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount].destroy();
		}

		// Remove all references to the particles by
		// re-initialising the particles array
		this._particles = [];

		return this;
	}

	/**
	 * Takes a base value and a variance range and returns a random
	 * value between the range, added to the base.
	 * @param {Number} base The base value.
	 * @param {Array} variance An array containing the two values of
	 * the variance range.
	 * @param {Boolean} floorIt If set to true, will cause the returned
	 * value to be passed through Math.floor().
	 * @return {Number} Returns the final value based upon the base
	 * value and variance range.
	 */
	baseAndVarianceValue (base: number, variance: [number, number], floorIt: boolean = false) {
		base = base || 0;
		variance = variance || [0, 0];
		let variant;

		if (floorIt) {
			variant = Math.floor(variance[0] + Math.random() * (variance[1] - variance[0]));
		} else {
			variant = (variance[0] + Math.random() * (variance[1] - variance[0]));
		}

		return base + variant;
	}

	vectorFromBaseMinMax (vectorData: IgeParticleVectorBaseMinMax): IgePoint3d {
		if (vectorData.min && vectorData.max) {
			const base = vectorData.base;
			const min = vectorData.min;
			const max = vectorData.max;
			return {
				x: base.x + (min.x + Math.random() * (max.x - min.x)),
				y: base.y + (min.y + Math.random() * (max.y - min.y)),
				z: base.z + (min.z + Math.random() * (max.z - min.z))
			} as IgePoint3d;
		} else {
			// There was no variance data so return the base vector
			return vectorData.base;
		}
	}

	/**
	 * Creates and maintains the particles that this emitter is
	 * responsible for spawning and controlling.
	 * @param ctx
	 */
	tick (ctx: IgeCanvasRenderingContext2d) {
		this._currentDelta += ige.engine._tickDelta;

		if (!this._particle) return;

		// Check if the emitter is mounted to anything and started, if not
		// then don't bother creating particles!
		if (this._parent && this._started) {
			if (!this._quantityMax || this._quantityProduced < this._quantityMax) {
				let particleCount,
					translateX,
					translateY,
					translateZ,
					//vectorAngle,
					//vectorPower,
					velocityVector,
					newVecX, newVecY,
					rotX, rotY,
					cosRot, sinRot,
					scaleX,
					scaleY,
					scaleZ,
					rotate,
					opacity,
					life,
					//linearForceAngle,
					//linearForcePower,
					linearForceVector,
					deathScaleX = 1,
					deathScaleY = 1,
					deathScaleZ = 1,
					deathRotate,
					deathOpacity,
					tempParticle,
					tweens,
					scaleProps: IgeTweenPropertyObject,
					i;

				if (this._currentDelta > this._quantityTimespan) {
					this._currentDelta = this._quantityTimespan;
				}

				if (this._currentDelta >= this._particlesPerTimeVector) {
					particleCount = ((this._currentDelta / this._particlesPerTimeVector) | 0); // Bitwise floor
					this._currentDelta -= (this._particlesPerTimeVector * particleCount);

					// Loop the particle array and if no particle exists,
					// create one to fill the space. Basically this keeps
					// the emitters creating new particles until it is
					// stopped.
					if (particleCount) {
						while (particleCount--) {
							if (this._quantityMax) {
								this._quantityProduced++;

								// If the number of particles produced is equal to or greater
								// than the max we should produce then exit the loop
								if (this._quantityProduced >= this._quantityMax) {
									this.stop();
									break;
								}
							}

							// Create the initial particle values based on
							// the emitter options values

							// Generate the particle's initial translate values
							translateX = this.baseAndVarianceValue(this._translateBaseX, this._translateVarianceX, true);
							translateY = this.baseAndVarianceValue(this._translateBaseY, this._translateVarianceY, true);
							translateZ = this.baseAndVarianceValue(this._translateBaseZ, this._translateVarianceZ, true);

							//translateX += this._worldMatrix.matrix[2];
							//translateY += this._worldMatrix.matrix[5];

							if (this._velocityVector) {
								// Generate the particle's initial vector angle and power
								velocityVector = this.vectorFromBaseMinMax(this._velocityVector);

								// Rotate the vector's point to match the current emitter rotation
								rotX = velocityVector.x;
								rotY = velocityVector.y;
								cosRot = this._worldMatrix.matrix[0]; //Math.cos(this._rotate.z);
								sinRot = this._worldMatrix.matrix[3]; //Math.sin(this._rotate.z);
								newVecX = rotX * cosRot - rotY * sinRot;
								newVecY = rotY * cosRot + rotX * sinRot;

								// Assign the rotated vector back again
								velocityVector.x = newVecX;
								velocityVector.y = newVecY;
							}

							//vectorAngle = this.baseAndVarianceValue(this._vectorAngleBase, this._vectorAngleVariance, true);
							//vectorPower = this.baseAndVarianceValue(this._vectorPowerBase, this._vectorPowerVariance, false);

							// Generate the particle's initial scale
							scaleX = this.baseAndVarianceValue(this._scaleBaseX, this._scaleVarianceX, false);
							scaleZ = scaleY = scaleX;

							if (!this._scaleLockAspect) {
								scaleY = this.baseAndVarianceValue(this._scaleBaseY, this._scaleVarianceY, false);
								scaleZ = this.baseAndVarianceValue(this._scaleBaseZ, this._scaleVarianceZ, false);
							}

							// Generate the particle's initial rotation
							rotate = this.baseAndVarianceValue(this._rotateBase, this._rotateVariance, true);

							// Generate the particle's initial opacity
							opacity = this.baseAndVarianceValue(this._opacityBase, this._opacityVariance, false);

							// Generate the particle's initial lifespan
							life = this.baseAndVarianceValue(this._lifeBase, this._lifeVariance, true);

							// Generate the particle's linear force vector angle and power
							if (this._linearForceVector) {
								linearForceVector = this.vectorFromBaseMinMax(this._linearForceVector);

								// Rotate the vector's point to match the current emitter rotation
								rotX = linearForceVector.x;
								rotY = linearForceVector.y;
								cosRot = this._worldMatrix.matrix[0]; //Math.cos(this._rotate.z);
								sinRot = this._worldMatrix.matrix[3]; //Math.sin(this._rotate.z);
								newVecX = rotX * cosRot - rotY * sinRot;
								newVecY = rotY * cosRot + rotX * sinRot;

								// Assign the rotated vector back again
								linearForceVector.x = newVecX;
								linearForceVector.y = newVecY;
							}

							//linearForceAngle = this.baseAndVarianceValue(this._linearForceAngleBase, this._linearForceAngleVariance);
							//linearForcePower = this.baseAndVarianceValue(this._linearForcePowerBase, this._linearForcePowerVariance, false);

							// Generate the particle's death scale
							if (typeof (this._deathScaleBaseX) !== "undefined") {
								deathScaleX = this.baseAndVarianceValue(
									this._deathScaleBaseX,
									this._deathScaleVarianceX,
									false
								);
							}
							if (typeof (this._deathScaleBaseY) !== "undefined" && !this._deathScaleLockAspect) {
								deathScaleY = this.baseAndVarianceValue(
									this._deathScaleBaseY,
									this._deathScaleVarianceY,
									false
								);
							}
							if (typeof (this._deathScaleBaseZ) !== "undefined" && !this._deathScaleLockAspect) {
								deathScaleZ = this.baseAndVarianceValue(
									this._deathScaleBaseZ,
									this._deathScaleVarianceZ,
									false
								);
							}
							if (this._deathScaleLockAspect) {
								deathScaleZ = deathScaleY = deathScaleX;
							}

							// Generate the particle's death rotation
							if (typeof (this._deathRotateBase) !== "undefined") {
								deathRotate = this.baseAndVarianceValue(
									this._deathRotateBase,
									this._deathRotateVariance,
									true
								);
							}

							// Generate the particle's death opacity
							if (typeof (this._deathOpacityBase) !== "undefined") {
								deathOpacity = this.baseAndVarianceValue(
									this._deathOpacityBase,
									this._deathOpacityVariance,
									false
								);
							}

							// Create the particle entity
							tempParticle = new this._particle(this);

							// Add the current transform of the emitter to the final
							// particle transforms
							if (this._ignoreCamera) {
								translateX += this._translate.x;
								translateY += this._translate.y;
							} else {
								translateX += this._worldMatrix.matrix[2];
								translateY += this._worldMatrix.matrix[5];
							}
							translateZ += this._translate.z;

							scaleX *= this._scale.x;
							scaleY *= this._scale.y;
							scaleZ *= this._scale.z;

							deathScaleX *= this._scale.x;
							deathScaleY *= this._scale.y;
							deathScaleZ *= this._scale.z;

							// Apply all the transforms (don't do this in the initial
							// entity definition because some components may already
							// have initialised due to the particle template
							tempParticle.translateTo(translateX, translateY, translateZ);
							tempParticle.rotateTo(0, 0, degreesToRadians(rotate));
							tempParticle.scaleTo(scaleX, scaleY, scaleZ);
							tempParticle.opacity(opacity);

							if (this._applyDepthToParticles) {
								tempParticle.depth(this._depth);
							}
							if (this._applyLayerToParticles) {
								tempParticle.layer(this._layer);
							}

							if (typeof (velocityVector) === "object") {
								(tempParticle.components.velocity as IgeVelocityComponent).vector3(velocityVector, false);
							}

							if (typeof (linearForceVector) === "object") {
								(tempParticle.components.velocity as IgeVelocityComponent).linearForceVector3(linearForceVector, false);
							}

							tweens = [];
							if (typeof (deathRotate) !== "undefined") {
								tweens.push(new IgeTween(ige)
									.targetObj(tempParticle._rotate)
									.properties({ "z": degreesToRadians(deathRotate) })
									.duration(life));
							}
							if (typeof (deathOpacity) !== "undefined") {
								tweens.push(new IgeTween(ige)
									.targetObj(tempParticle)
									.properties({ "_opacity": deathOpacity })
									.duration(life));
							}

							scaleProps = {};
							if (typeof (deathScaleX) !== "undefined") {
								scaleProps.x = deathScaleX;
							}
							if (typeof (deathScaleY) !== "undefined") {
								scaleProps.y = deathScaleY;
							}
							if (typeof (deathScaleZ) !== "undefined") {
								scaleProps.z = deathScaleZ;
							}

							if (scaleProps.x || scaleProps.y || scaleProps.z) {
								tweens.push(
									new IgeTween()
										.targetObj(tempParticle._scale)
										.properties(scaleProps)
										.duration(life)
								);
							}

							if (typeof (life) === "number") {
								tempParticle.lifeSpan(life);
							}

							// Add the particle to this emitter's particle array
							this._particles.push(tempParticle);

							// Add the particle to the scene
							tempParticle.mount(this._particleMountTarget || this._parent);

							// Start the relevant tweens
							for (i = 0; i < tweens.length; i++) {
								tweens[i].start();
							}
						}
					}
				}
			}
		}

		super.tick(ctx);
	}

	/**
	 * Returns an array of the current particle entities that this
	 * emitter has spawned.
	 * @return {Array} The array of particle entities the emitter spawned.
	 */
	particles () {
		return this._particles;
	}

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {String}
	 */
	// _stringify (options) {
	// 	// Get the properties for all the super-classes
	// 	let str = IgeUiEntity.prototype._stringify.call(this), i;
	// 	return str;
	//
	// 	// TODO: WRITE THIS FOR THIS CLASS - EPIC AMOUNT OF WORK HERE
	// 	// Loop properties and add property assignment code to string
	// 	for (i in this) {
	// 		if (this.hasOwnProperty(i) && this[i] !== undefined) {
	// 			switch (i) {
	// 			case "":
	// 				str += ".text(" + this.text() + ")";
	// 				break;
	// 			}
	// 		}
	// 	}
	//
	// 	return str;
	// }
}

