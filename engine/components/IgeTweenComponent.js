/**
 * This component is already included in the IgeEngine (ige)
 * instance and is not designed for use in any other way!
 * It handles global tween processing on all tweening values.
 */
var IgeTweenComponent = IgeClass.extend({
	classId: 'IgeTweenComponent',
	componentId: 'tween',

	init: function (entity, options) {
		this._entity = entity;
		this._transform = entity.transform;

		// Setup the array that will hold our active tweens
		this._tweens = [];

		// Add the tween behaviour to the entity 
		entity.addBehaviour('tween', this.update);
	},

	/**
	 * Start tweening particular properties for the object.
	 * @param {IgeTween} tween The tween to start.
	 * @return {Number} The index of the added tween or -1 on error.
	 */
	start: function (tween) {
		if (tween._startTime > ige._currentTime) {
			// The tween is scheduled for later
			// Push the tween into the IgeTweenComponent's _tweens array
			this._tweens.push(tween);
		} else {
			// The tween should start immediately
			tween._currentStep = 0;
			
			// Setup the tween's step
			if (this._setupStep(tween, false)) {
				// Push the tween into the IgeTweenComponent's _tweens array
				this._tweens.push(tween);
			}
		}

		// Enable tweening on the IgeTweenComponent
		this.enable();

		// Return the tween
		return tween;
	},

	_setupStep: function (tween, newTime) {
		var targetObj = tween._targetObj,
			step = tween._steps[tween._currentStep],
			propertyNameAndValue, // = tween._propertyObj
			durationMs,
			endTime,
			easing,
			propertyIndex,
			targetData = [];

		if (step) {
			propertyNameAndValue = step.props;
		}

		if (targetObj) {
			// Check / fill some option defaults
			if (tween._currentStep === 0 && !newTime) {
				// Because we are on step zero we can check for a start time
				if (tween._startTime === undefined) {
					tween._startTime = ige._currentTime;
				}
			} else {
				// We're not on step zero anymore so the new step start time
				// is NOW!
				tween._startTime = ige._currentTime;
			}

			durationMs = step.durationMs ? step.durationMs : tween._durationMs;
			tween._selectedEasing = step.easing ? step.easing : tween._easing;

			// Calculate the end time
			tween._endTime = tween._startTime + durationMs;

			for (propertyIndex in propertyNameAndValue) {
				if (propertyNameAndValue.hasOwnProperty(propertyIndex)) {
					targetData.push({
						targetObj: targetObj,
						propName: propertyIndex,
						deltaVal: propertyNameAndValue[propertyIndex] - (step.isDelta ? 0 : targetObj[propertyIndex]), // The diff between end and start values
						oldDelta: 0 // Var to save the old delta in order to get the actual difference data.
					});
				}
			}

			tween._targetData = targetData;
			tween._destTime = tween._endTime - tween._startTime;

			return tween; // Return the tween
		} else {
			this.log('Cannot start tweening properties of the specified object "' + obj + '" because it does not exist!', 'error');
		}
	},

	/**
	 * Removes the specified tween from the active tween list.
	 * @param {IgeTween} tween The tween to stop.
	 */
	stop: function (tween) {
		// Store the new tween details in the item
		this._tweens.pull(tween);

		if (!this._tweens.length) {
			// Disable tweening on this item as there are
			// no more tweens to process
			this.disable();
		}
		
		return this;
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

		return this;
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

		return this;
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

		return this;
	},

	/**
	 * Process tweening for the object.
	 */
	update: function (ctx) {
		var thisTween = this.tween;
		if (thisTween._tweens && thisTween._tweens.length) {
			var currentTime = ige._tickStart,
				tweens = thisTween._tweens,
				tweenCount = tweens.length,
				tween,
				deltaTime,
				destTime,
				easing,
				item,
				targetProp,
				targetPropVal,
				targets,
				targetIndex,
				stepIndex,
				stopped,
				currentDelta;

			// Loop the item's tweens
			while (tweenCount--) {
				tween = tweens[tweenCount];
				stopped = false;

				// Check if we should be starting this tween yet
				if (tween._started || currentTime >= tween._startTime) {
					if (!tween._started) {
						// Check if the tween's step is -1 indicating no step
						// data has been set up yet
						if (tween._currentStep === -1) {
							// Setup the tween step now
							tween._currentStep = 0;
							thisTween._setupStep(tween, false);
						}
						
						// Check if we have a beforeTween callback to fire
						if (typeof(tween._beforeTween) === 'function') {
							// Fire the beforeTween callback
							tween._beforeTween(tween);

							// Delete the callback so we don't store it any longer
							delete tween._beforeTween;
						}

						// Check if we have a beforeStep callback to fire
						if (typeof(tween._beforeStep) === 'function') {
							// Fire the beforeStep callback
							if (tween._stepDirection) {
								stepIndex = tween._steps.length - (tween._currentStep + 1);
							} else {
								stepIndex = tween._currentStep;
							}
							tween._beforeStep(tween, stepIndex);
						}

						tween._started = true;
					}

					deltaTime = currentTime - tween._startTime; // Delta from start time to current time
					destTime = tween._destTime;
					easing = tween._selectedEasing;

					// Check if the tween has reached it's destination based upon
					// the current time
					if (deltaTime >= destTime) {
						// The tween time indicates the tween has ended so set to
						// the ending value
						targets = tween._targetData;

						for (targetIndex in targets) {
							if (targets.hasOwnProperty(targetIndex)) {
								item = targets[targetIndex];
								targetProp = item.targetObj;
								targetPropVal = targetProp[item.propName];
								
								// Check if the destination time is not zero
								// because otherwise the easing method will provide
								// a divide by zero error resulting in a NaN value
								if (destTime !== 0) {
									// Add the delta amount to destination
									currentDelta = thisTween.easing[easing](
										destTime,
										item.deltaVal,
										destTime
									);
								} else {
									currentDelta = item.deltaVal;
								}
								
								targetPropVal += currentDelta - item.oldDelta;
								
								// Round the value to correct floating point operation imprecision
								var roundingPrecision = Math.pow(10, 15-(targetPropVal.toFixed(0).toString().length));
								targetProp[item.propName] = Math.round(targetPropVal * roundingPrecision)/roundingPrecision;
							}
						}

						// Check if we have a afterStep callback to fire
						if (typeof(tween._afterStep) === 'function') {
							// Fire the afterStep
							if (tween._stepDirection) {
								stepIndex = tween._steps.length - (tween._currentStep + 1);
							} else {
								stepIndex = tween._currentStep;
							}
							tween._afterStep(tween, stepIndex);
						}

						if (tween._steps.length === tween._currentStep + 1) {
							// The tween has ended, is the tween repeat mode enabled?
							if (tween._repeatMode) {
								// We have a repeat mode, lets check for a count
								if (tween._repeatCount !== -1) {
									// Check if the repeat count has reached the
									// number of repeats we wanted
									tween._repeatedCount++;
									if (tween._repeatCount === tween._repeatedCount) {
										// The tween has ended
										stopped = true;
									}
								}

								if (!stopped) {
									// Work out what mode we're running on
									if (tween._repeatMode === 1) {
										tween._currentStep = 0;
									}

									if (tween._repeatMode === 2) {
										// We are on "reverse loop" mode so now
										// reverse the tween's steps and then
										// start from step zero
										tween._stepDirection = !tween._stepDirection;
										tween._steps.reverse();

										tween._currentStep = 1;
									}

									// Check if we have a stepsComplete callback to fire
									if (typeof(tween._stepsComplete) === 'function') {
										// Fire the stepsComplete callback
										tween._stepsComplete(tween, tween._currentStep);
									}

									// Check if we have a beforeStep callback to fire
									if (typeof(tween._beforeStep) === 'function') {
										// Fire the beforeStep callback
										if (tween._stepDirection) {
											stepIndex = tween._steps.length - (tween._currentStep + 1);
										} else {
											stepIndex = tween._currentStep;
										}
										tween._beforeStep(tween, stepIndex);
									}

									thisTween._setupStep(tween, true);
								}
							} else {
								stopped = true;
							}

							if (stopped) {
								// Now stop tweening this tween
								tween.stop();

								// If there is a callback, call it
								if (typeof(tween._afterTween) === 'function') {
									// Fire the afterTween callback
									tween._afterTween(tween);

									// Delete the callback so we don't store it any longer
									delete tween._afterTween;
								}
							}
						} else {
							// Start the next step
							tween._currentStep++;

							// Check if we have a beforeStep callback to fire
							if (typeof(tween._beforeStep) === 'function') {
								// Fire the beforeStep callback
								if (tween._stepDirection) {
									stepIndex = tween._steps.length - (tween._currentStep + 1);
								} else {
									stepIndex = tween._currentStep;
								}
								tween._beforeStep(tween, stepIndex);
							}

							thisTween._setupStep(tween, true);
						}
						
						if (typeof(tween._afterChange) === 'function') {
							tween._afterChange(tween, stepIndex);
						}
					} else {
						// The tween is still active, process the tween by passing it's details
						// to the selected easing method
						targets = tween._targetData;

						for (targetIndex in targets) {
							if (targets.hasOwnProperty(targetIndex)) {
								item = targets[targetIndex];
								var currentDelta = thisTween.easing[easing](
									deltaTime,
									item.deltaVal,
									destTime
								);
								item.targetObj[item.propName] += currentDelta - item.oldDelta;
								item.oldDelta = currentDelta;
							}
						}
						
						if (typeof(tween._afterChange) === 'function') {
							tween._afterChange(tween, stepIndex);
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
		none: function(t, c, d) {
			return c*t/d;
		},
		inQuad: function(t, c, d) {
			return c*(t/=d)*t;
		},
		outQuad: function(t, c, d) {
			return -c *(t/=d)*(t-2);
		},
		inOutQuad: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t; }
			return -c/2 *((--t)*(t-2) - 1);
		},
		inCubic: function(t, c, d) {
			return c*(t/=d)*t*t;
		},
		outCubic: function(t, c, d) {
			return c*((t=t/d-1)*t*t + 1);
		},
		inOutCubic: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t; }
			return c/2*((t-=2)*t*t + 2);
		},
		outInCubic: function(t, c, d) {
			if(t < d/2) { return this.outCubic(t*2, c/2, d); }
			return this.inCubic((t*2)-d, c/2, c/2, d);
		},
		inQuart: function(t, c, d) {
			return c*(t/=d)*t*t*t;
		},
		outQuart: function(t, c, d) {
			return -c *((t=t/d-1)*t*t*t - 1);
		},
		inOutQuart: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t*t; }
			return -c/2 *((t-=2)*t*t*t - 2);
		},
		outInQuart: function(t, c, d) {
			if(t < d/2) { return this.outQuart(t*2, c/2, d); }
			return this.inQuart((t*2)-d, c/2, c/2, d);
		},
		inQuint: function(t, c, d) {
			return c*(t/=d)*t*t*t*t;
		},
		outQuint: function(t, c, d) {
			return c*((t=t/d-1)*t*t*t*t + 1);
		},
		inOutQuint: function(t, c, d) {
			if((t/=d/2) < 1) { return c/2*t*t*t*t*t; }
			return c/2*((t-=2)*t*t*t*t + 2);
		},
		outInQuint: function(t, c, d) {
			if(t < d/2) { return this.outQuint(t*2, c/2, d); }
			return this.inQuint((t*2)-d, c/2, c/2, d);
		},
		inSine: function(t, c, d) {
			return -c * Math.cos(t/d *(Math.PI/2)) + c;
		},
		outSine: function(t, c, d) {
			return c * Math.sin(t/d *(Math.PI/2));
		},
		inOutSine: function(t, c, d) {
			return -c/2 *(Math.cos(Math.PI*t/d) - 1);
		},
		outInSine: function(t, c, d) {
			if(t < d/2) { return this.outSine(t*2, c/2, d); }
			return this.inSine((t*2)-d, c/2, c/2, d);
		},
		inExpo: function(t, c, d) {
			return(t === 0) ? 0 : c * Math.pow(2, 10 *(t/d - 1)) - c * 0.001;
		},
		outExpo: function(t, c, d) {
			return(t === d) ? c : c * 1.001 *(-Math.pow(2, -10 * t/d) + 1);
		},
		inOutExpo: function(t, c, d) {
			if(t === 0) { return 0; }
			if(t === d) { return c; }
			if((t/=d/2) < 1) { return c/2 * Math.pow(2, 10 *(t - 1)) - c * 0.0005; }
			return c/2 * 1.0005 *(-Math.pow(2, -10 * --t) + 2);
		},
		outInExpo: function(t, c, d) {
			if(t < d/2) { return this.outExpo(t*2, c/2, d); }
			return this.inExpo((t*2)-d, c/2, c/2, d);
		},
		inCirc: function(t, c, d) {
			return -c *(Math.sqrt(1 -(t/=d)*t) - 1);
		},
		outCirc: function(t, c, d) {
			return c * Math.sqrt(1 -(t=t/d-1)*t);
		},
		inOutCirc: function(t, c, d) {
			if((t/=d/2) < 1) { return -c/2 *(Math.sqrt(1 - t*t) - 1); }
			return c/2 *(Math.sqrt(1 -(t-=2)*t) + 1);
		},
		outInCirc: function(t, c, d) {
			if(t < d/2) { return this.outCirc(t*2, c/2, d); }
			return this.inCirc((t*2)-d, c/2, c/2, d);
		},
		inElastic: function(t, c, d, a, p) {
			var s;
			if(t===0) {return 0;}
			if((t/=d)===1) { return c; }
			if(!p) { p=d*0.3; }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p ));
		},
		outElastic: function(t, c, d, a, p) {
			var s;
			if(t===0) { return 0; }
			if((t/=d)===1) { return c; }
			if(!p) { p=d*0.3; }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			return(a*Math.pow(2,-10*t) * Math.sin((t*d-s)*(2*Math.PI)/p ) + c);
		},
		inOutElastic: function(t, c, d, a, p) {
			var s;
			if(t===0) { return 0; }
			if((t/=d/2)===2) { return c; }
			if(!p) { p=d*(0.3*1.5); }
			if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
			if(t < 1) { return -0.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p)); }
			return a*Math.pow(2,-10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p )*0.5 + c;
		},
		outInElastic: function(t, c, d, a, p) {
			if(t < d/2) { return this.outElastic(t*2, c/2, d, a, p); }
			return this.inElastic((t*2)-d, c/2, c/2, d, a, p);
		},
		inBack: function(t, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			return c*(t/=d)*t*((s+1)*t - s);
		},
		outBack: function(t, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1);
		},
		inOutBack: function(t, c, d, s) {
			if(s === undefined) { s = 1.70158; }
			if((t/=d/2) < 1) { return c/2*(t*t*(((s*=(1.525))+1)*t - s)); }
			return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
		},
		outInBack: function(t, c, d, s) {
			if(t < d/2) { return this.outBack(t*2, c/2, d, s); }
			return this.inBack((t*2)-d, c/2, c/2, d, s);
		},
		inBounce: function(t, c, d) {
			return c - this.outBounce(d-t, 0, c, d);
		},
		outBounce: function(t, c, d) {
			if((t/=d) <(1/2.75)) {
				return c*(7.5625*t*t);
			} else if(t <(2/2.75)) {
				return c*(7.5625*(t-=(1.5/2.75))*t + 0.75);
			} else if(t <(2.5/2.75)) {
				return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375);
			} else {
				return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375);
			}
		},
		inOutBounce: function(t, c, d) {
			if(t < d/2) {
				return this.inBounce(t*2, 0, c, d) * 0.5;
			} else {
				return this.outBounce(t*2-d, 0, c, d) * 0.5 + c*0.5;
			}
		},
		outInBounce: function(t, c, d) {
			if(t < d/2) { return this.outBounce(t*2, c/2, d); }
			return this.inBounce((t*2)-d, c/2, c/2, d);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTweenComponent; }