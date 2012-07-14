var IgeTweenComponent = IgeClass.extend({
	classId: 'IgeTweenComponent',
	componentId: 'tween',

	init: function (entity, options) {
		this._entity = entity;
		this._transform = entity.transform;

		// Setup the array that will hold our active tweens
		this._tweens = [];

		// Add the velocity behaviour to the entity
		entity.addBehavior('tween', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param entity
	 * @private
	 */
	_behaviour: function (ctx, entity) {
		entity.tween.tick(ctx);
	},

	/**
	 * Start tweening particular properties for the object.
	 * @param obj
	 * @param propertyNameAndValue
	 * @param durationMs
	 * @param options
	 * @return {Number} The index of the added tween or -1 on error.
	 */
	start: function (obj, propertyNameAndValue, durationMs, options) {
		var tweenObj = obj,
			endTime,
			propertyIndex,
			targetData = [];

		if (tweenObj) {
			// Check / fill some option defaults
			options = options || [];

			if (options.easing === undefined) { options.easing = 'none'; }
			if (options.startTime === undefined) { options.startTime = new Date().getTime(); }
			if (durationMs === undefined) { durationMs = 0; }

			// Calculate the end time
			endTime = options.startTime + durationMs;

			for (propertyIndex in propertyNameAndValue) {
				targetData.push({
					targetObj: tweenObj,
					propName: propertyIndex,
					startVal: tweenObj[propertyIndex], // The starting value of the tween
					endVal: propertyNameAndValue[propertyIndex], // The target value of the tween
					deltaVal: propertyNameAndValue[propertyIndex] - tweenObj[propertyIndex] // The diff between start and end values
				});
			}

			// Push the new tween into the tweens array
			this._tweens.push({
				targets: targetData, // The tween target properties and values
				duration: durationMs, // The duration that the tween should run for
				easing: options.easing, // Easing method to use
				startTime: options.startTime, // The time to start the tween op
				endTime: endTime, // The time the tween will end
				destTime: endTime - options.startTime, // The difference between start and end times
				beforeTween: options.beforeTween, // Callback before tween starts
				afterTween: options.afterTween, // Callback when tween ends
				_started: false // Internal flag for if tween has started yet
			});

			// Enable tweening on this entity
			this.enable();

			return this._tweens.length - 1; // Return the index of the tween
		} else {
			this.log('Cannot start tweening properties of the specified object "' + obj + '" because it does not exist!', 'error');
			return -1;
		}
	},

	/**
	 * Stop tweening a transform property for the object.
	 * @param {Number} tweenIndex
	 */
	stop: function (tweenIndex) {
		// Store the new tween details in the item
		this._tweens.splice(tweenIndex, 1);

		if (!this._tweens.length) {
			// Disable tweening on this item
			this.disable();
		}
	},

	/**
	 * Stop all tweening for the object.
	 */
	stopAll: function () {
		// Disable tweening
		this.disable();

		// Remove all tween details
		delete this._tweens;
		this._tweens = [];
	},

	/**
	 * Enable tweening for the object.
	 */
	enable: function () {
		// Check if the item is currently tweening
		if (!this._tweening) {
			// Set the item to tweening
			this._tweening = true;
		}
	},

	/**
	 * Disable tweening for the object.
	 */
	disable: function () {
		// Check if the item is currently tweening
		if (this._tweening) {
			// Set the item to not tweening
			this._tweening = false;
		}
	},

	/**
	 * Process tweening for the object.
	 */
	tick: function (ctx) {
		if (this._tweens && this._tweens.length) {
			var currentTime = ige.tickStart,
				tweens = this._tweens,
				tweenCount = tweens.length,
				tween,
				deltaTime,
				destTime,
				easing,
				item,
				targets,
				targetIndex;

			// Loop the item's tweens
			while (tweenCount--) {
				tween = tweens[tweenCount];

				// Check if we should be starting this tween yet
				if (tween._started || currentTime >= tween.startTime) {
					if (!tween._started) {
						// Check if we have a beforeTween callback to fire
						if (typeof(tween.beforeTween) === 'function') {
							// Fire the beforeTween callback
							tween.beforeTween(tween);

							// Delete the callback so we don't store it any longer
							delete tween.beforeTween;
						}

						tween._started = true;
					}

					deltaTime = currentTime - tween.startTime; // Delta from start time to current time
					destTime = tween.destTime;
					easing = tween.easing;

					// Check if the tween has reached it's destination based upon
					// the current time
					if (deltaTime >= destTime) {
						// The tween time indicates the tween has ended so set to
						// the ending value and stop the tween
						targets = tween.targets;

						for (targetIndex in targets) {
							if (targets.hasOwnProperty(targetIndex)) {
								item = targets[targetIndex];
								item.targetObj[item.propName] = item.endVal;
							}
						}

						// Now stop tweening this tween
						this.stop(tweenCount);

						// If there is a callback, call it
						if (typeof(tween.afterTween) === 'function') {
							// Fire the beforeTween callback
							tween.afterTween(tween);

							// Delete the callback so we don't store it any longer
							delete tween.afterTween;
						}
					} else {
						// The tween is still active, process the tween by passing it's details
						// to the selected easing method
						targets = tween.targets;

						for (targetIndex in targets) {
							if (targets.hasOwnProperty(targetIndex)) {
								item = targets[targetIndex];
								item.targetObj[item.propName] = this.easing[easing](
									deltaTime,
									item.startVal,
									item.deltaVal,
									destTime
								);
							}
						}
					}
				}
			}
		}
	},

	/** tweenEasing - Contains all the tween easing functions. {
		category:"property",
		type:"object",
	} **/
	easing: {
		// Easing equations converted from AS to JS from original source at
		// http://robertpenner.com/easing/
		none: function(t, b, c, d) {
			return c*t/d + b;
		},
		inQuad: function(t, b, c, d) {
			return c*(t/=d)*t + b;
		},
		outQuad: function(t, b, c, d) {
			return -c *(t/=d)*(t-2) + b;
		},
		inOutQuad: function(t, b, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t + b; }
			return -c/2 *((--t)*(t-2) - 1) + b;
		},
		inCubic: function(t, b, c, d) {
			return c*(t/=d)*t*t + b;
		},
		outCubic: function(t, b, c, d) {
			return c*((t=t/d-1)*t*t + 1) + b;
		},
		inOutCubic: function(t, b, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t + b; }
			return c/2*((t-=2)*t*t + 2) + b;
		},
		outInCubic: function(t, b, c, d) {
			if(t < d/2) { return this.outCubic(t*2, b, c/2, d); }
			return this.inCubic((t*2)-d, b+c/2, c/2, d);
		},
		inQuart: function(t, b, c, d) {
			return c*(t/=d)*t*t*t + b;
		},
		outQuart: function(t, b, c, d) {
			return -c *((t=t/d-1)*t*t*t - 1) + b;
		},
		inOutQuart: function(t, b, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t*t + b; }
			return -c/2 *((t-=2)*t*t*t - 2) + b;
		},
		outInQuart: function(t, b, c, d) {
			if(t < d/2) { return this.outQuart(t*2, b, c/2, d); }
			return this.inQuart((t*2)-d, b+c/2, c/2, d);
		},
		inQuint: function(t, b, c, d) {
			return c*(t/=d)*t*t*t*t + b;
		},
		outQuint: function(t, b, c, d) {
			return c*((t=t/d-1)*t*t*t*t + 1) + b;
		},
		inOutQuint: function(t, b, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t*t*t + b; }
			return c/2*((t-=2)*t*t*t*t + 2) + b;
		},
		outInQuint: function(t, b, c, d) {
			if(t < d/2) { return this.outQuint(t*2, b, c/2, d); }
			return this.inQuint((t*2)-d, b+c/2, c/2, d);
		},
		inSine: function(t, b, c, d) {
			return -c * Math.cos(t/d *(Math.PI/2)) + c + b;
		},
		outSine: function(t, b, c, d) {
			return c * Math.sin(t/d *(Math.PI/2)) + b;
		},
		inOutSine: function(t, b, c, d) {
			return -c/2 *(Math.cos(Math.PI*t/d) - 1) + b;
		},
		outInSine: function(t, b, c, d) {
			if(t < d/2) { return this.outSine(t*2, b, c/2, d); }
			return this.inSine((t*2)-d, b+c/2, c/2, d);
		},
		inExpo: function(t, b, c, d) {
			return(t === 0) ? b : c * Math.pow(2, 10 *(t/d - 1)) + b - c * 0.001;
		},
		outExpo: function(t, b, c, d) {
			return(t === d) ? b+c : c * 1.001 *(-Math.pow(2, -10 * t/d) + 1) + b;
		},
		inOutExpo: function(t, b, c, d) {
			if(t === 0) { return b; }
			if(t === d) { return b+c; }
			if((t/=d/2) < 1) { return c/2 * Math.pow(2, 10 *(t - 1)) + b - c * 0.0005; }
			return c/2 * 1.0005 *(-Math.pow(2, -10 * --t) + 2) + b;
		},
		outInExpo: function(t, b, c, d) {
			if(t < d/2) { return this.outExpo(t*2, b, c/2, d); }
			return this.inExpo((t*2)-d, b+c/2, c/2, d);
		},
		inCirc: function(t, b, c, d) {
			return -c *(Math.sqrt(1 -(t/=d)*t) - 1) + b;
		},
		outCirc: function(t, b, c, d) {
			return c * Math.sqrt(1 -(t=t/d-1)*t) + b;
		},
		inOutCirc: function(t, b, c, d) {
			if((t/=d/2) < 1) { return -c/2 *(Math.sqrt(1 - t*t) - 1) + b; }
			return c/2 *(Math.sqrt(1 -(t-=2)*t) + 1) + b;
		},
		outInCirc: function(t, b, c, d) {
			if(t < d/2) { return this.outCirc(t*2, b, c/2, d); }
			return this.inCirc((t*2)-d, b+c/2, c/2, d);
		},
		inElastic: function(t, b, c, d, a, p) {
			var s;
			if(t===0) {return b;}
			if((t/=d)===1) { return b+c; }
			if(!p) { p=d*0.3; }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p )) + b;
		},
		outElastic: function(t, b, c, d, a, p) {
			var s;
			if(t===0) { return b; }
			if((t/=d)===1) { return b+c; }
			if(!p) { p=d*0.3; }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			return(a*Math.pow(2,-10*t) * Math.sin((t*d-s)*(2*Math.PI)/p ) + c + b);
		},
		inOutElastic: function(t, b, c, d, a, p) {
			var s;
			if(t===0) { return b; }
			if((t/=d/2)===2) { return b+c; }
			if(!p) { p=d*(0.3*1.5); }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			if(t < 1) { return -0.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p )) + b; }
			return a*Math.pow(2,-10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p )*0.5 + c + b;
		},
		outInElastic: function(t, b, c, d, a, p) {
			if(t < d/2) { return this.outElastic(t*2, b, c/2, d, a, p); }
			return this.inElastic((t*2)-d, b+c/2, c/2, d, a, p);
		},
		inBack: function(t, b, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			return c*(t/=d)*t*((s+1)*t - s) + b;
		},
		outBack: function(t, b, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
		},
		inOutBack: function(t, b, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			if((t/=d/2) < 1) { return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b; }
			return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
		},
		outInBack: function(t, b, c, d, s) {
			if(t < d/2) { return this.outBack(t*2, b, c/2, d, s); }
			return this.inBack((t*2)-d, b+c/2, c/2, d, s);
		},
		inBounce: function(t, b, c, d) {
			return c - this.outBounce(d-t, 0, c, d) + b;
		},
		outBounce: function(t, b, c, d) {
			if((t/=d) <(1/2.75)) {
				return c*(7.5625*t*t) + b;
			} else if(t <(2/2.75)) {
				return c*(7.5625*(t-=(1.5/2.75))*t + 0.75) + b;
			} else if(t <(2.5/2.75)) {
				return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375) + b;
			} else {
				return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375) + b;
			}
		},
		inOutBounce: function(t, b, c, d) {
			if(t < d/2) {
				return this.inBounce(t*2, 0, c, d) * 0.5 + b;
			} else {
				return this.outBounce(t*2-d, 0, c, d) * 0.5 + c*0.5 + b;
			}
		},
		outInBounce: function(t, b, c, d) {
			if(t < d/2) { return this.outBounce(t*2, b, c/2, d); }
			return this.inBounce((t*2)-d, b+c/2, c/2, d);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTweenComponent; }