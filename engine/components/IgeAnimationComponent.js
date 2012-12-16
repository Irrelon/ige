/**
 * The animation component class. Handles defining and controlling
 * frame-based animations based on cells from a texture.
 */
var IgeAnimationComponent = IgeEventingClass.extend({
	classId: 'IgeAnimationComponent',
	componentId: 'animation',

	/**
	 * @constructor
	 * @param {Object} entity The parent object that this component is being added to.
	 * @param {Object=} options An optional object that is passed to the component when it is being initialised.
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._anims = {};

		// Add the animation behaviour to the entity
		entity.addBehaviour('tween', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param {CanvasRenderingContext2D} ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		this.animation.tick(ctx);
	},

	/**
	 * Defines an animation specifying the frames to use, the
	 * frames per second to animate at and if the animation
	 * should loop and if so, how many times.
	 * @param {String} id The unique animation id.
	 * @param {Array} frames An array of cell numbers to animate through.
	 * @param {Number} fps The speed of the animation (frames per second).
	 * @param {Number} loop The number of times to loop the animation, or -1 to loop forever. Defaults to -1.
	 * @param {Boolean} convertIdsToIndex If true will convert cell ids to cell indexes to speed
	 * up animation processing. This is true by default but should be disabled if you intend to
	 * change the assigned texture of the entity that this animation is applied to after you have
	 * defined the animation since the frame indexes will likely map to incorrect cells on a
	 * different texture.
	 * @return {*}
	 */
	define: function (id, frames, fps, loop, convertIdsToIndex) {
		if (frames && frames.length) {
			var i, frame;
			this._anims.length = this._anims.length || 0;

			if (convertIdsToIndex === undefined) {
				convertIdsToIndex = true; // Default the flag to true if undefined
			}

			if (convertIdsToIndex) {
				// Check each frame for string values
				for (i = 0; i < frames.length; i++) {
					frame = frames[i];
					if (typeof(frame) === 'string') {
						if (this._entity._texture) {
							// The frame has a cell id so convert to an index
							frame = this._entity._texture.cellIdToIndex(frame);
						} else {
							this.log('You can increase the performance of id-based cell animations by specifying the animation.define AFTER you have assigned your sprite sheet to the entity on entity with ID: ' + this._entity.id(), 'warning');
							break;
						}
					}
				}
			}

			// Store the animation
			var frameTime = ((1000 / fps)|0);
			this._anims[id] = {
				frames: frames,
				frameTime: frameTime,
				loop: loop !== undefined ? loop : -1, // Default to infinite loop (-1)
				frameCount: frames.length,
				totalTime: frames.length * frameTime,
				currentDelta: 0,
				currentLoop: 0
			};

			this._anims.length++;
		} else {
			this.log('Cannot define an animation without a frame array!', 'error');
		}
		return this._entity;
	},

	/**
	 * Starts an animation.
	 * @param {String} animId The id of the animation to start.
	 * @param {Object=} options An object with some option properties.
	 * @return {*}
	 */
	start: function (animId, options) {
		if (this._anims) {
			var anim = this._anims[animId];

			if (anim) {
				anim.currentDelta = 0;
				anim.currentLoop = 0;
				anim.startTime = ige._currentTime;

				this._anim = anim;
				this._animId = animId;
				
				// Check for any callbacks in the options object
				if (options !== undefined) {
					this._completeCallback = options.onComplete;
					this._loopCallback = options.onLoop;
					this._stoppedCallback = options.onStopped;
				}

				this.emit('started', anim);
			} else {
				this.log('Cannot set animation to "' + animId + '" because the animation does not exist!', 'warning');
			}
		} else {
			this.log('Cannot set animation to "' + animId + '" because no animations have been defined with defineAnim(...);', 'warning');
		}

		return this._entity;
	},

	/**
	 * Starts an animation only if an animation is not already started.
	 * @param {String} animId The id of the animation to start.
	 * @param {Object=} options An object with some option properties.
	 * @return {*}
	 */
	select: function (animId, options) {
		if (this._animId !== animId) {
			this.start(animId, options);
		}

		return this._entity;
	},

	/**
	 * Stops the current animation.
	 * @return {*}
	 */
	stop: function () {
		if (this._stoppedCallback) {
			this._stoppedCallback.call(this);
		}
		
		this.emit('stopped', this._anim);

		delete this._anim;
		delete this._animId;

		return this._entity;
	},

	/**
	 * Handles the animation processing each render tick.
	 * @param {CanvasRenderingContext2D} ctx The rendering context to use when doing draw operations.
	 */
	tick: function (ctx) {
		if (this._anim) {
			var _tickDelta = ige._tickDelta,
				anim = this._anim,
				multiple,
				cell,
				frame;

			// Advance the internal animation timer
			anim.currentDelta += _tickDelta;

			// Check if the animation timer is greater than the total animation time
			if (anim.currentDelta > anim.totalTime) {
				// Check if we have a single loop animation
				if (!anim.loop) {
					if (this._completeCallback) {
						this._completeCallback.call(this);
					}
					this.emit('complete', anim);
					this.stop();
				} else {
					// Check if we have an infinite loop
					if (anim.loop === -1) {
						// Loop back round to the beginning
						multiple = anim.currentDelta / anim.totalTime;
						if (Math.abs(multiple) > 1) {
							anim.currentDelta -= ((multiple|0) * anim.totalTime); // Bitwise floor
						}

						if (this._loopCallback) {
							this._loopCallback.call(this);
						}
						this.emit('loopComplete', anim);
					} else {
						anim.currentLoop++;
						if (anim.loop > 0 && anim.currentLoop <= anim.loop) {
							// Loop back round to the beginning
							multiple = anim.currentDelta / anim.totalTime;
							if (Math.abs(multiple) > 1) {
								anim.currentDelta -= ((multiple|0) * anim.totalTime); // Bitwise floor
							}

							if (this._loopCallback) {
								this._loopCallback.call(this);
							}
							this.emit('loopComplete', anim);
						} else {
							// The animation has ended
							if (this._completeCallback) {
								this._completeCallback.call(this, []);
							}
							this.emit('complete', anim);
							this.stop();
						}
					}
				}
			}

			frame = ((anim.currentDelta / anim.frameTime)|0);

			if (frame >= anim.frameCount) {
				frame = anim.frameCount - 1;
			}

			cell = anim.frames[frame];

			// Set the current frame
			if (typeof(cell) === 'string') {
				this._entity.cellById(cell);
			} else {
				this._entity.cell(cell);
			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeAnimationComponent; }