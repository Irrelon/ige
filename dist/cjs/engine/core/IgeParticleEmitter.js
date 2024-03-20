"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeParticleEmitter = void 0;
const IgeTween_1 = require("./IgeTween.js");
const IgeUiEntity_1 = require("./IgeUiEntity.js");
const instance_1 = require("../instance.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
const maths_1 = require("../utils/maths.js");
/**
 * Creates a new particle emitter.
 */
class IgeParticleEmitter extends IgeUiEntity_1.IgeUiEntity {
    constructor() {
        super();
        this.classId = "IgeParticleEmitter";
        this.IgeParticleEmitter = true;
        this._started = false;
        this._applyDepthToParticles = true;
        this._applyLayerToParticles = true;
        this._quantityTimespan = 1000;
        this._quantityBase = 10;
        this._quantityVariance = [0, 0];
        this._quantityMax = 0; // Unlimited = 0
        this._quantityProduced = 0;
        this._translateBaseX = 0;
        this._translateBaseY = 0;
        this._translateBaseZ = 0;
        this._translateVarianceX = [0, 0];
        this._translateVarianceY = [0, 0];
        this._translateVarianceZ = [0, 0];
        this._rotateBase = 0;
        this._rotateVariance = [0, 0];
        this._deathRotateBase = 0;
        this._deathRotateVariance = [0, 0];
        this._scaleBaseX = 0;
        this._scaleBaseY = 0;
        this._scaleBaseZ = 0;
        this._scaleVarianceX = [0, 0];
        this._scaleVarianceY = [0, 0];
        this._scaleVarianceZ = [0, 0];
        this._scaleLockAspect = false;
        this._deathScaleBaseX = 1;
        this._deathScaleBaseY = 1;
        this._deathScaleBaseZ = 1;
        this._deathScaleVarianceX = [0, 0];
        this._deathScaleVarianceY = [0, 0];
        this._deathScaleVarianceZ = [0, 0];
        this._deathScaleLockAspect = false;
        this._opacityBase = 1;
        this._opacityVariance = [0, 0];
        this._deathOpacityBase = 1;
        this._deathOpacityVariance = [0, 0];
        this._lifeBase = 1000;
        this._lifeVariance = [0, 0];
        this._maxParticles = 1;
        this._particlesPerTimeVector = 1;
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
    particle(obj) {
        this._particle = obj;
        return this;
    }
    particleMountTarget(obj) {
        this._particleMountTarget = obj;
        return this;
    }
    applyDepthToParticles(val) {
        this._applyDepthToParticles = val;
        return this;
    }
    applyLayerToParticles(val) {
        this._applyLayerToParticles = val;
        return this;
    }
    quantityTimespan(val) {
        this._quantityTimespan = val;
        return this;
    }
    quantityBase(val) {
        this._quantityBase = val;
        return this;
    }
    quantityVariance(a, b) {
        this._quantityVariance = [a, b];
        return this;
    }
    quantityMax(val) {
        this._quantityMax = val;
        this._quantityProduced = 0;
        return this;
    }
    translateBaseX(val) {
        this._translateBaseX = val;
        return this;
    }
    translateBaseY(val) {
        this._translateBaseY = val;
        return this;
    }
    translateBaseZ(val) {
        this._translateBaseZ = val;
        return this;
    }
    translateVarianceX(a, b) {
        this._translateVarianceX = [a, b];
        return this;
    }
    translateVarianceY(a, b) {
        this._translateVarianceY = [a, b];
        return this;
    }
    translateVarianceZ(a, b) {
        this._translateVarianceZ = [a, b];
        return this;
    }
    rotateBase(val) {
        this._rotateBase = val;
        return this;
    }
    rotateVariance(a, b) {
        this._rotateVariance = [a, b];
        return this;
    }
    deathRotateBase(val) {
        this._deathRotateBase = val;
        return this;
    }
    deathRotateVariance(a, b) {
        this._deathRotateVariance = [a, b];
        return this;
    }
    scaleBaseX(val) {
        this._scaleBaseX = val;
        return this;
    }
    scaleBaseY(val) {
        this._scaleBaseY = val;
        return this;
    }
    scaleBaseZ(val) {
        this._scaleBaseZ = val;
        return this;
    }
    scaleVarianceX(a, b) {
        this._scaleVarianceX = [a, b];
        return this;
    }
    scaleVarianceY(a, b) {
        this._scaleVarianceY = [a, b];
        return this;
    }
    scaleVarianceZ(a, b) {
        this._scaleVarianceZ = [a, b];
        return this;
    }
    scaleLockAspect(val) {
        this._scaleLockAspect = val;
        return this;
    }
    deathScaleBaseX(val) {
        this._deathScaleBaseX = val;
        return this;
    }
    deathScaleBaseY(val) {
        this._deathScaleBaseY = val;
        return this;
    }
    deathScaleBaseZ(val) {
        this._deathScaleBaseZ = val;
        return this;
    }
    deathScaleVarianceX(a, b) {
        this._deathScaleVarianceX = [a, b];
        return this;
    }
    deathScaleVarianceY(a, b) {
        this._deathScaleVarianceY = [a, b];
        return this;
    }
    deathScaleVarianceZ(a, b) {
        this._deathScaleVarianceZ = [a, b];
        return this;
    }
    deathScaleLockAspect(val) {
        this._deathScaleLockAspect = val;
        return this;
    }
    opacityBase(val) {
        this._opacityBase = val;
        return this;
    }
    opacityVariance(a, b) {
        this._opacityVariance = [a, b];
        return this;
    }
    deathOpacityBase(val) {
        this._deathOpacityBase = val;
        return this;
    }
    deathOpacityVariance(a, b) {
        this._deathOpacityVariance = [a, b];
        return this;
    }
    lifeBase(val) {
        this._lifeBase = val;
        return this;
    }
    lifeVariance(a, b) {
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
    velocityVector(baseVector, minVector, maxVector) {
        this._velocityVector = {
            base: baseVector,
            min: minVector,
            max: maxVector
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
    linearForceVector(baseVector, minVector, maxVector) {
        this._linearForceVector = {
            base: baseVector,
            min: minVector,
            max: maxVector
        };
        return this;
    }
    /**
     * Starts the particle emitter which will begin spawning
     * particle entities based upon the emitter's current settings.
     * @return {*}
     */
    start() {
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
        }
        else {
            this.log("Cannot start particle emitter because no particle class was specified with a call to particle()", "error");
        }
        return this;
    }
    updateSettings() {
        this._maxParticles = this.baseAndVarianceValue(this._quantityBase, this._quantityVariance, true);
        this._particlesPerTimeVector = this._quantityTimespan / this._maxParticles; // 1 Particle every x milliseconds (x stored in this._particlesPerTimeVector)
    }
    /**
     * Stops the particle emitter. The current particles will
     * continue to process until they reach their natural lifespan.
     * @return {*}
     */
    stop() {
        this._started = false;
        return this;
    }
    /**
     * Stops the particle emitter. The current particles will be
     * destroyed immediately.
     * @return {*}
     */
    stopAndKill() {
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
     * @param {number} base The base value.
     * @param {Array} variance An array containing the two values of
     * the variance range.
     * @param {boolean} floorIt If set to true, will cause the returned
     * value to be passed through Math.floor().
     * @return {number} Returns the final value based upon the base
     * value and variance range.
     */
    baseAndVarianceValue(base, variance, floorIt = false) {
        base = base || 0;
        variance = variance || [0, 0];
        let variant;
        if (floorIt) {
            variant = Math.floor(variance[0] + Math.random() * (variance[1] - variance[0]));
        }
        else {
            variant = variance[0] + Math.random() * (variance[1] - variance[0]);
        }
        return base + variant;
    }
    vectorFromBaseMinMax(vectorData) {
        if (vectorData.min && vectorData.max) {
            const base = vectorData.base;
            const min = vectorData.min;
            const max = vectorData.max;
            return {
                x: base.x + (min.x + Math.random() * (max.x - min.x)),
                y: base.y + (min.y + Math.random() * (max.y - min.y)),
                z: base.z + (min.z + Math.random() * (max.z - min.z))
            };
        }
        else {
            // There was no variance data so return the base vector
            return vectorData.base;
        }
    }
    /**
     * Creates and maintains the particles that this emitter is
     * responsible for spawning and controlling.
     * @param ctx
     */
    tick(ctx) {
        this._currentDelta += instance_1.ige.engine._tickDelta;
        if (!this._particle)
            return;
        // Check if the emitter is mounted to anything and started, if not
        // then don't bother creating particles!
        if (this._parent && this._started) {
            if (!this._quantityMax || this._quantityProduced < this._quantityMax) {
                let particleCount, translateX, translateY, translateZ, 
                //vectorAngle,
                //vectorPower,
                velocityVector, newVecX, newVecY, rotX, rotY, cosRot, sinRot, scaleX, scaleY, scaleZ, rotate, opacity, life, 
                //linearForceAngle,
                //linearForcePower,
                linearForceVector, deathScaleX = 1, deathScaleY = 1, deathScaleZ = 1, deathRotate, deathOpacity, tempParticle, tweens, scaleProps, i;
                if (this._currentDelta > this._quantityTimespan) {
                    this._currentDelta = this._quantityTimespan;
                }
                if (this._currentDelta >= this._particlesPerTimeVector) {
                    particleCount = (this._currentDelta / this._particlesPerTimeVector) | 0; // Bitwise floor
                    this._currentDelta -= this._particlesPerTimeVector * particleCount;
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
                            if (typeof this._deathScaleBaseX !== "undefined") {
                                deathScaleX = this.baseAndVarianceValue(this._deathScaleBaseX, this._deathScaleVarianceX, false);
                            }
                            if (typeof this._deathScaleBaseY !== "undefined" && !this._deathScaleLockAspect) {
                                deathScaleY = this.baseAndVarianceValue(this._deathScaleBaseY, this._deathScaleVarianceY, false);
                            }
                            if (typeof this._deathScaleBaseZ !== "undefined" && !this._deathScaleLockAspect) {
                                deathScaleZ = this.baseAndVarianceValue(this._deathScaleBaseZ, this._deathScaleVarianceZ, false);
                            }
                            if (this._deathScaleLockAspect) {
                                deathScaleZ = deathScaleY = deathScaleX;
                            }
                            // Generate the particle's death rotation
                            if (typeof this._deathRotateBase !== "undefined") {
                                deathRotate = this.baseAndVarianceValue(this._deathRotateBase, this._deathRotateVariance, true);
                            }
                            // Generate the particle's death opacity
                            if (typeof this._deathOpacityBase !== "undefined") {
                                deathOpacity = this.baseAndVarianceValue(this._deathOpacityBase, this._deathOpacityVariance, false);
                            }
                            // Create the particle entity
                            tempParticle = new this._particle(this);
                            // Add the current transform of the emitter to the final
                            // particle transforms
                            if (this._ignoreCamera) {
                                translateX += this._translate.x;
                                translateY += this._translate.y;
                            }
                            else {
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
                            tempParticle.rotateTo(0, 0, (0, maths_1.degreesToRadians)(rotate));
                            tempParticle.scaleTo(scaleX, scaleY, scaleZ);
                            tempParticle.opacity(opacity);
                            if (this._applyDepthToParticles) {
                                tempParticle.depth(this._depth);
                            }
                            if (this._applyLayerToParticles) {
                                tempParticle.layer(this._layer);
                            }
                            if (typeof velocityVector === "object") {
                                tempParticle.components.velocity.vector3(velocityVector, false);
                            }
                            if (typeof linearForceVector === "object") {
                                tempParticle.components.velocity.linearForceVector3(linearForceVector, false);
                            }
                            tweens = [];
                            if (typeof deathRotate !== "undefined") {
                                tweens.push(new IgeTween_1.IgeTween(instance_1.ige)
                                    .targetObj(tempParticle._rotate)
                                    .properties({ z: (0, maths_1.degreesToRadians)(deathRotate) })
                                    .duration(life));
                            }
                            if (typeof deathOpacity !== "undefined") {
                                tweens.push(new IgeTween_1.IgeTween(instance_1.ige)
                                    .targetObj(tempParticle)
                                    .properties({ _opacity: deathOpacity })
                                    .duration(life));
                            }
                            scaleProps = {};
                            if (typeof deathScaleX !== "undefined") {
                                scaleProps.x = deathScaleX;
                            }
                            if (typeof deathScaleY !== "undefined") {
                                scaleProps.y = deathScaleY;
                            }
                            if (typeof deathScaleZ !== "undefined") {
                                scaleProps.z = deathScaleZ;
                            }
                            if (scaleProps.x || scaleProps.y || scaleProps.z) {
                                tweens.push(new IgeTween_1.IgeTween().targetObj(tempParticle._scale).properties(scaleProps).duration(life));
                            }
                            if (typeof life === "number") {
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
    particles() {
        return this._particles;
    }
}
exports.IgeParticleEmitter = IgeParticleEmitter;
(0, igeClassStore_1.registerClass)(IgeParticleEmitter);
