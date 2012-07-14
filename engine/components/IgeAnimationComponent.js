var IgeAnimationComponent = IgeClass.extend({
	classId: 'IgeAnimationComponent',
	componentId: 'animation',

	init: function (entity, options) {
		this._entity = entity;
		this._anims = {};

		// Add the animation behaviour to the entity
		entity.addBehavior('tween', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param entity
	 * @private
	 */
	_behaviour: function (ctx, entity) {
		entity.animation.tick(ctx);
	},

	define: function (id, frames, fps, loop) {
		if (frames && frames.length) {
			this._anims.length = this._anims.length || 0;

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

	start: function (animId) {
		if (this._anims) {
			var anim = this._anims[animId];

			if (anim) {
				anim.currentDelta = 0;
				anim.currentLoop = 0;
				anim.startTime = new Date().getTime();

				this._anim = anim;
				this._animId = animId;
			} else {
				this.log('Cannot set animation to "' + animId + '" because the animation does not exist!', 'warning');
			}
		} else {
			this.log('Cannot set animation to "' + animId + '" because no animations have been defined with defineAnim(...);', 'warning');
		}

		return this._entity;
	},

	select: function (animId) {
		if (this._animId !== animId) {
			this.start(animId);
		}

		return this._entity;
	},

	stop: function () {
		delete this._anim;
		delete this._animId;

		return this._entity;
	},

	tick: function (ctx) {
		if (this._anim) {
			var tickDelta = ige.tickDelta,
				anim = this._anim,
				multiple,
				cell,
				frame;

			// Advance the internal animation timer
			anim.currentDelta += tickDelta;

			// Check if the animation timer is greater than the total animation time
			if (anim.currentDelta > anim.totalTime) {
				// Check if we have a single loop animation
				if (!anim.loop) {
					this.stop();
				} else {
					// Check if we have an infinite loop
					if (anim.loop === -1) {
						// Loop back round to the beginning
						multiple = anim.currentDelta / anim.totalTime;
						if (Math.abs(multiple) > 1) {
							anim.currentDelta -= ((multiple|0) * anim.totalTime); // Bitwise floor
						}
					} else {
						anim.currentLoop++;
						if (anim.loop > 0 && anim.currentLoop <= anim.loop) {
							// Loop back round to the beginning
							multiple = anim.currentDelta / anim.totalTime;
							if (Math.abs(multiple) > 1) {
								anim.currentDelta -= ((multiple|0) * anim.totalTime); // Bitwise floor
							}
						} else {
							// The animation has ended
							this.stop();
							//return;
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
			this._entity.cell(cell);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeAnimationComponent; }