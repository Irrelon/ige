var IgeParticleEmitter = IgeEntity.extend({
	classId: 'IgeParticleEmitter',
	IgeParticleEmitter: true,

	init: function () {
		// IgeBody.init()
		this._super();

		// Set some defaults
		this._quantityTimespan = 1000;
		this._currentDelta = 0;
		this._started = false;
		this._particles = [];
	},

	/* particle - Sets the class that all particles emitted from this
	emitter will be created from. {
		category:"method",
	} */
	particle: function (obj) {
		this._particle = obj;
	},

	quantityTimespan: function (val) {
		this._quantityTimespan = val;
	},

	quantityBase: function (val) {
		this._quantityBase = val;
	},

	quantityVariance: function (a, b) {
		this._quantityVariance = [a, b];
	},

	quantityMax: function (val) {
		this._quantityMax = val;
		this._quantityProduced = 0;
	},

	translateBaseX: function (val) {
		this._translateBaseX = val;
	},

	translateBaseY: function (val) {
		this._translateBaseY = val;
	},

	translateBaseZ: function (val) {
		this._translateBaseZ = val;
	},

	translateVarianceX: function (a, b) {
		this._translateVarianceX = [a, b];
	},

	translateVarianceY: function (a, b) {
		this._translateVarianceY = [a, b];
	},

	translateVarianceZ: function (a, b) {
		this._translateVarianceZ = [a, b];
	},

	rotateBase: function (val) {
		this._rotateBase = val;
	},

	rotateVariance: function (a, b) {
		this._rotateVariance = [a, b];
	},

	deathRotateBase: function (val) {
		this._deathRotateBase = val;
	},

	deathRotateVariance: function (a, b) {
		this._deathRotateVariance = [a, b];
	},

	scaleBaseX: function (val) {
		this._scaleBaseX = val;
	},

	scaleBaseY: function (val) {
		this._scaleBaseY = val;
	},

	scaleBaseZ: function (val) {
		this._scaleBaseZ = val;
	},

	scaleVarianceX: function (a, b) {
		this._scaleVarianceX = [a, b];
	},

	scaleVarianceY: function (a, b) {
		this._scaleVarianceY = [a, b];
	},

	scaleVarianceZ: function (a, b) {
		this._scaleVarianceZ = [a, b];
	},

	scaleLockAspect: function (val) {
		this._scaleLockAspect = val;
	},

	deathScaleBaseX: function (val) {
		this._deathScaleBaseX = val;
	},

	deathScaleBaseY: function (val) {
		this._deathScaleBaseY = val;
	},

	deathScaleBaseZ: function (val) {
		this._deathScaleBaseZ = val;
	},

	deathScaleVarianceX: function (a, b) {
		this._deathScaleVarianceX = [a, b];
	},

	deathScaleVarianceY: function (a, b) {
		this._deathScaleVarianceY = [a, b];
	},

	deathScaleVarianceZ: function (a, b) {
		this._deathScaleVarianceZ = [a, b];
	},

	deathScaleLockAspect: function (val) {
		this._deathScaleLockAspect = val;
	},

	opacityBase: function (val) {
		this._opacityBase = val;
	},

	opacityVariance: function (a, b) {
		this._opacityVariance = [a, b];
	},

	deathOpacityBase: function (val) {
		this._deathOpacityBase = val;
	},

	deathOpacityVariance: function (a, b) {
		this._deathOpacityVariance = [a, b];
	},

	lifeBase: function (val) {
		this._lifeBase = val;
	},

	lifeVariance: function (a, b) {
		this._lifeVariance = [a, b];
	},

	/*vectorAngleBase: function (val) {
		this._vectorAngleBase = val;
	},

	vectorAngleVariance: function (a, b) {
		this._vectorAngleVariance = [a, b];
	},

	vectorPowerBase: function (val) {
		this._vectorPowerBase = val;
	},

	vectorPowerVariance: function (a, b) {
		this._vectorPowerVariance = [a, b];
	},*/

	/**
	 * Sets the base velocity vector of each emitted particle and optionally
	 * the min and max vectors that are used to randomize the resulting particle
	 * velocity vector.
	 * @param baseVector
	 * @param minVector
	 * @param maxVector
	 */
	velocityVector: function (baseVector, minVector, maxVector) {
		this._velocityVector = {
			base: baseVector,
			min: minVector,
			max: maxVector
		};
	},

	/*linearForceAngleBase: function (val) {
		this._linearForceAngleBase = val;
	},

	linearForceAngleVariance: function (a, b) {
		this._linearForceAngleVariance = [a, b];
	},

	linearForcePowerBase: function (val) {
		this._linearForcePowerBase = val;
	},

	linearForcePowerVariance: function (a, b) {
		this._linearForcePowerVariance = [a, b];
	},*/

	linearForceVector: function (baseVector, minVector, maxVector) {
		this._linearForceVector = {
			base: baseVector,
			min: minVector,
			max: maxVector
		};
	},

	/** start - Starts the particle emitter which will begin spawning
	particle entities based upon the emitter's current settings. {
		category:"method",
		returns: {
			type:"bool",
			desc:"Returns true if the emitter started successfully or false if not."
		},
	} **/
	start: function () {
		if (this._particle) {
			this._quantityTimespan = this._quantityTimespan || 1000;
			this._maxParticles = this.baseAndVarianceValue(this._quantityBase, this._quantityVariance, true);
			this._particlesPerTimeVector = this._quantityTimespan / this._maxParticles; // 1 Particle every x milliseconds (x stored in this._particlesPerTimeVector)
			this._currentDelta = 0;

			// Set the emitter started flag
			this._quantityProduced = 0;
			this._started = true;
		} else {
			this.log('Cannot start particle emitter because no particle class was specified with a call to particle()', 'error');
		}
	},

	/** stop - Stops the particle emitter. The current
	particles will continue to process until they reach
	their natural lifespan. {
		category:"method",
	} **/
	stop: function () {
		this._started = false;
	},

	/** stopAndKill - Stops the particle emitter. The current
	particles will be destroyed immediately. {
		category:"method",
	} **/
	stopAndKill: function () {
		this._started = false;

		// Loop the particles array and destroy all the particles
		var arr = this._particles,
			arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount].destroy();
		}

		// Remove all references to the particles by
		// re-initialising the particles array
		this._particles = [];
	},

	/** baseAndVarianceValue - Takes a base value and a variance range
	and returns a random value between the range, added to the base. {
		category:"method",
		arguments: [{
			name:"base",
			type:"float",
			desc:"The base value.",
		}, {
			name:"variance",
			type:"array",
			desc:"An array containing the two values of the variance range.",
		}, {
			name:"floorIt",
			type:"bool",
			desc:"If set to true, will cause the returned value to be passed through Math.floor().",
			flags:"optional",
		}],
		returns: {
			type:"bool",
			desc:"Returns the final value based upon the base value and variance range.",
		},
	} **/
	baseAndVarianceValue: function (base, variance, floorIt) {
		base = base || 0;
		variance = variance || [0, 0];
		var variant = 0;

		if (floorIt) {
			variant = Math.floor(variance[0] + Math.random() * (variance[1] - variance[0]));
		} else {
			variant = (variance[0] + Math.random() * (variance[1] - variance[0]));
		}

		return base + variant;
	},

	vectorFromBaseMinMax: function (vectorData) {
		if (vectorData.min && vectorData.max) {
			var base = vectorData.base,
				min = vectorData.min,
				max = vectorData.max,
				newVector = {};

			newVector.x = base.x + (min.x + Math.random() * (max.x - min.x));
			newVector.y = base.y + (min.y + Math.random() * (max.y - min.y));
			newVector.z = base.z + (min.z + Math.random() * (max.z - min.z));

			return newVector;
		} else {
			// There was no variance data so return the base vector
			return vectorData.base;
		}
	},

	/** tick - Creates and maintains the particles that this
	emitter is responsible for spawning and controlling. {
		category:"method",
	} **/
	tick: function (tickDelta, render, ctx) {
		this._currentDelta += tickDelta;

		// Check if the emitter is mounted to anything, if not
		// then don't bother creating particles!
		if (this._parent) {
			if (!this._quantityMax || this._quantityProduced < this._quantityMax) {
				var particleCount,
					translateX,
					translateY,
					translateZ,
					//vectorAngle,
					//vectorPower,
					velocityVector,
					scaleX,
					scaleY,
					scaleZ,
					rotate,
					opacity,
					life,
					//linearForceAngle,
					//linearForcePower,
					linearForceVector,
					deathScaleX,
					deathScaleY,
					deathScaleZ,
					deathRotate,
					deathOpacity,
					tempParticle,
					tweenProps;

				if (this._currentDelta > this._quantityTimespan) {
					this._currentDelta = this._quantityTimespan;
				}

				if (this._currentDelta >= this._particlesPerTimeVector) {
					particleCount = ((this._currentDelta / this._particlesPerTimeVector)|0); // Bitwise floor
					this._currentDelta -= (this._particlesPerTimeVector * particleCount);

					// Loop the particle array and if no particle exists,
					// create one to fill the space. Basically this keeps
					// the emitters creating new particles until it is
					// stopped.
					if (particleCount) {
						while (particleCount--) {
							if (this._quantityMax) {
								this._quantityProduced ++;

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

							// Generate the particle's initial vector angle and power
							velocityVector = this.vectorFromBaseMinMax(this._velocityVector);
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
							linearForceVector = this.vectorFromBaseMinMax(this._linearForceVector);
							//linearForceAngle = this.baseAndVarianceValue(this._linearForceAngleBase, this._linearForceAngleVariance);
							//linearForcePower = this.baseAndVarianceValue(this._linearForcePowerBase, this._linearForcePowerVariance, false);

							// Generate the particle's death scale
							if (typeof(this._deathScaleBaseX) !== 'undefined') {
								deathScaleX = this.baseAndVarianceValue(
									this._deathScaleBaseX,
									this._deathScaleVarianceX,
									false
								);
							}
							if (typeof(this._deathScaleBaseY) !== 'undefined' && !this._deathScaleLockAspect) {
								deathScaleY = this.baseAndVarianceValue(
									this._deathScaleBaseY,
									this._deathScaleVarianceY,
									false
								);
							}
							if (typeof(this._deathScaleBaseZ) !== 'undefined' && !this._deathScaleLockAspect) {
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
							if (typeof(this._deathRotateBase) !== 'undefined') {
								deathRotate = this.baseAndVarianceValue(
									this._deathRotateBase,
									this._deathRotateVariance,
									true
								);
							}

							// Generate the particle's death opacity
							if (typeof(this._deathOpacityBase) !== 'undefined') {
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
							translateX += this._transform[0];
							translateY += this._transform[1];
							translateZ += this._transform[2];

							scaleX *= this._transform[6];
							scaleY *= this._transform[7];
							scaleZ *= this._transform[8];

							deathScaleX *= this._transform[6];
							deathScaleY *= this._transform[7];
							deathScaleZ *= this._transform[8];

							rotate += this._transform[3];
							//vectorAngle += this._transform[3];
							//linearForceAngle += this._transform[3];

							// Apply all the transforms (don't do this in the initial
							// entity definition because some components may already
							// have initialised due to the particle template
							tempParticle.translate(translateX, translateY, translateZ);
							tempParticle.rotate(rotate);
							tempParticle.scale(scaleX, scaleY, scaleZ);
							tempParticle.opacity(opacity);

							/*if (typeof(vectorAngle) === 'number' && typeof(vectorPower) === 'number') {
								tempParticle.velocity(vectorAngle, vectorPower);
							}*/
							if (typeof(velocityVector) === 'object') {
								tempParticle.velocityVector3d(velocityVector, false);
							}
							/*if (typeof(linearForceAngle) === 'number' && typeof(linearForcePower) === 'number') {
								tempParticle.linearForce(linearForceAngle, linearForcePower);
							}*/
							if (typeof(linearForceVector) === 'object') {
								tempParticle.linearForceVector3d(linearForceVector, false);
							}

							if (typeof(life) === 'number') {
								tempParticle.lifeSpan(life);
							}

							tweenProps = {};
							if (typeof(deathRotate) !== 'undefined') {
								tweenProps.rotateX = deathRotate + this._transform[3];
							}
							if (typeof(deathOpacity) !== 'undefined') {
								tweenProps.opacityX = deathOpacity;
							}
							if (typeof(deathScaleX) !== 'undefined') {
								tweenProps.scaleX = deathScaleX;
							}
							if (typeof(deathScaleY) !== 'undefined') {
								tweenProps.scaleY = deathScaleY;
							}
							if (typeof(deathScaleZ) !== 'undefined') {
								tweenProps.scaleZ = deathScaleZ;
							}
							// Start the relevant tweens
							tempParticle.tweenStart(tweenProps, life, {direct:true});

							// Register our remove handler with the particle entity
							tempParticle._destroy.push(function () {
								this._emitter._particles.pull(this);
							});

							// Add the particle to this emitter's particle array
							this._particles.push(tempParticle);

							// Add the particle to the scene
							tempParticle.mount(this._parent);
						}
					}
				}
			}
		}

		this._super(tickDelta, render, ctx);
	},

	/** particles - Returns an array of the current
	particle entities that this emitter has spawned. {
		category:"method",
		returns: {
			type:"array",
			desc:"The array of particle entities the emitter spawned.",
		},
	} **/
	particles: function () {
		return this._particles;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeParticleEmitter; }