import IgeBaseClass from "../core/IgeBaseClass";
import IgeComponent from "../core/IgeComponent";
import {arrPull} from "../services/utils";
import IgeTween from "../core/IgeTween";
import Ige from "../core/Ige";
import IgeEntity from "../core/IgeEntity";

/**
 * This component is already included in the IgeRoot (ige)
 * instance and is not designed for use in any other way!
 * It handles global tween processing on all tweening values.
 */
class IgeTweenComponent extends IgeComponent {
	static componentTargetClass = "Ige";
	classId = "IgeTweenComponent";
	componentId = "tween";
	_tweens: IgeTween[];

	constructor (entity: IgeBaseClass, options?: any) {
		super(entity, options);

		// Set up the array that will hold our active tweens
		this._tweens = [];

		// Add the tween behaviour to the entity
		entity.addBehaviour("tween", this.update);
	}

	/**
	 * Start tweening particular properties for the object.
	 * @param {IgeTween} tween The tween to start.
	 * @return {Number} The index of the added tween or -1 on error.
	 */
	start (tween: IgeTween) {
		if (tween._startTime > this._ige._currentTime) {
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
	}

	_setupStep (tween: IgeTween, newTime: number) {
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
						targetObj,
						"propName": propertyIndex,
						"deltaVal": propertyNameAndValue[propertyIndex] - (step.isDelta ? 0 : targetObj[propertyIndex]), // The diff between end and start values
						"oldDelta": 0 // Var to save the old delta in order to get the actual difference data.
					});
				}
			}

			tween._targetData = targetData;
			tween._destTime = tween._endTime - tween._startTime;

			return tween; // Return the tween
		} else {
			this.log("Cannot start tweening properties of the specified object \"" + obj + "\" because it does not exist!", "error");
		}
	}

	/**
	 * Removes the specified tween from the active tween list.
	 * @param {IgeTween} tween The tween to stop.
	 */
	stop (tween: IgeTween) {
		// Store the new tween details in the item
		arrPull(this._tweens, tween);

		if (!this._tweens.length) {
			// Disable tweening on this item as there are
			// no more tweens to process
			this.disable();
		}

		return this;
	}

	/**
	 * Stop all tweening for the object.
	 */
	stopAll () {
		// Disable tweening
		this.disable();

		// Remove all tween details
		delete this._tweens;
		this._tweens = [];

		return this;
	}

	/**
	 * Enable tweening for the object.
	 */
	enable () {
		// Check if the item is currently tweening
		if (!this._tweening) {
			// Set the item to tweening
			this._tweening = true;
		}

		return this;
	}

	/**
	 * Disable tweening for the object.
	 */
	disable () {
		// Check if the item is currently tweening
		if (this._tweening) {
			// Set the item to not tweening
			this._tweening = false;
		}

		return this;
	}

	/**
	 * Process tweening for the object.
	 */
	update (ige: Ige, entity: IgeEntity, ctx: CanvasRenderingContext2D) {
		var thisTween = ige.tween;
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
						if (typeof(tween._beforeTween) === "function") {
							// Fire the beforeTween callback
							tween._beforeTween(tween);

							// Delete the callback so we don't store it any longer
							delete tween._beforeTween;
						}

						// Check if we have a beforeStep callback to fire
						if (typeof(tween._beforeStep) === "function") {
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
						if (typeof(tween._afterStep) === "function") {
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
									if (typeof(tween._stepsComplete) === "function") {
										// Fire the stepsComplete callback
										tween._stepsComplete(tween, tween._currentStep);
									}

									// Check if we have a beforeStep callback to fire
									if (typeof(tween._beforeStep) === "function") {
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
								if (typeof(tween._afterTween) === "function") {
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
							if (typeof(tween._beforeStep) === "function") {
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

						if (typeof(tween._afterChange) === "function") {
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

						if (typeof(tween._afterChange) === "function") {
							tween._afterChange(tween, stepIndex);
						}
					}
				}
			}
		}
	}
}

export default IgeTweenComponent;