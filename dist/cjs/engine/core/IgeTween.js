"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTween = exports.IgeTween = void 0;
const IgeBaseClass_1 = require("./IgeBaseClass.js");
const instance_1 = require("../instance.js");
const arrays_1 = require("../utils/arrays.js");
const easing_1 = require("../utils/easing.js");
/**
 * Creates a new tween instance.
 */
class IgeTween extends IgeBaseClass_1.IgeBaseClass {
    constructor(targetObj, propertyObj, durationMs, options) {
        super();
        this.classId = "IgeTween";
        this._startTime = undefined;
        this._selectedEasing = "none";
        this._endTime = 0;
        this._targetData = [];
        this._destTime = 0;
        this._repeatMode = 0;
        this._repeatCount = 0;
        this._repeatedCount = 0;
        this._easing = "none";
        // Create a new tween object and return it
        // so the user can decide when to start it
        this._targetObj = targetObj;
        this._steps = [];
        this._currentStep = -1;
        if (propertyObj !== undefined) {
            this.stepTo(propertyObj);
        }
        this._durationMs = durationMs !== undefined ? durationMs : 0;
        this._started = false;
        this._stepDirection = false;
        // Sort out the options
        if (options && options.easing) {
            this.easing(options.easing);
        }
        else {
            this.easing("none");
        }
        if (options && options.startTime !== undefined) {
            this.startTime(options.startTime);
        }
        if (options && options.beforeTween !== undefined) {
            this.beforeTween(options.beforeTween);
        }
        if (options && options.afterTween !== undefined) {
            this.afterTween(options.afterTween);
        }
    }
    /**
     * Sets the object in which the properties to tween exist.
     * @param targetObj
     * @return {*}
     */
    targetObj(targetObj) {
        if (targetObj !== undefined) {
            this._targetObj = targetObj;
        }
        return this;
    }
    /**
     * Sets the tween's target properties to tween to.
     * @param propertyObj
     * @return {*}
     */
    properties(propertyObj) {
        if (propertyObj !== undefined) {
            // Reset any existing steps and add this new one
            this._steps = [];
            this._currentStep = -1;
            this.stepTo(propertyObj);
        }
        return this;
    }
    repeatMode(val, count) {
        if (val !== undefined) {
            this._repeatMode = val;
            this.repeatCount(count);
            return this;
        }
        return this._repeatMode;
    }
    /**
     * Gets / sets the repeat count. The count determines the
     * number of times the tween will be repeated before stopping.
     * Setting the count to -1 will make it repeat infinitely.
     * This setting is used in conjunction with the repeatMode()
     * method. If you just set a repeat count and no mode then
     * the tween will not repeat.
     * @param val
     * @return {*}
     */
    repeatCount(val) {
        if (val !== undefined) {
            this._repeatCount = val;
            this._repeatedCount = 0;
            return this;
        }
        return this._repeatCount;
    }
    /**
     * Defines a step in a multi-stage tween. Uses the properties
     * as destination value.
     * @param {Object} propertyObj The properties to
     * tween during this step.
     * @param {number=} durationMs The number of milliseconds
     * to spend tweening this step, or if not provided uses
     * the current tween durationMs setting.
     * @param {string=} easing The name of the easing method
     * to use during this step.
     * @param {boolean=} delta If true will set the step to use
     * delta values instead of absolute values as the destination.
     * @return {*} this for chaining.
     */
    stepTo(propertyObj, durationMs, easing, delta) {
        if (propertyObj !== undefined) {
            // Check if we have already been given a standard
            // non-staged property
            this._steps.push({
                props: propertyObj,
                durationMs,
                easing,
                isDelta: delta
            });
        }
        return this;
    }
    /**
     * Defines a step in a multi-stage tween. Uses the properties
     * as deltas, not as destination values
     * @param {Object} propertyObj The properties to
     * tween during this step.
     * @param {number=} durationMs The number of milliseconds
     * to spend tweening this step, or if not provided uses
     * the current tween durationMs setting.
     * @param {string=} easing The name of the easing method
     * to use during this step.
     * @return {*}
     */
    stepBy(propertyObj, durationMs, easing) {
        this.stepTo(propertyObj, durationMs, easing, true);
        return this;
    }
    /**
     * Sets the duration of the tween in milliseconds.
     * @param durationMs
     * @return {*}
     */
    duration(durationMs) {
        if (durationMs !== undefined) {
            this._durationMs = durationMs;
        }
        return this;
    }
    /**
     * Sets the method to be called just before the tween has started.
     * @param callback
     * @return {*}
     */
    beforeTween(callback) {
        if (callback !== undefined) {
            this._beforeTween = callback;
        }
        return this;
    }
    /**
     * Sets the method to be called just after the tween has ended.
     * @param callback
     * @return {*}
     */
    afterTween(callback) {
        if (callback !== undefined) {
            this._afterTween = callback;
        }
        return this;
    }
    /**
     * Sets the method to be called just before a tween step has
     * started.
     * @param callback
     * @return {*}
     */
    beforeStep(callback) {
        if (callback !== undefined) {
            this._beforeStep = callback;
        }
        return this;
    }
    /**
     * Sets the method to be called just after a tween step has
     * ended.
     * @param callback
     * @return {*}
     */
    afterStep(callback) {
        if (callback !== undefined) {
            this._afterStep = callback;
        }
        return this;
    }
    /**
     * Sets the method to be called just after a tween has changed
     * the values of the target object every update tick.
     * @param callback
     * @return {*}
     */
    afterChange(callback) {
        if (callback !== undefined) {
            this._afterChange = callback;
        }
        return this;
    }
    /**
     * Returns the object that this tween is modifying.
     * @return {*}
     */
    targetObject() {
        return this._targetObj;
    }
    easing(methodName) {
        if (methodName === undefined) {
            return this._easing;
        }
        if (!easing_1.easingFunctions[methodName]) {
            throw new Error("The easing method you have selected does not exist, please use a valid easing method. For a list of easing methods please inspect `easingFunctions`");
        }
        this._easing = methodName;
        return this;
    }
    /**
     * Sets the timestamp at which the tween should start.
     * @param timeMs
     * @return {*}
     */
    startTime(timeMs) {
        if (timeMs !== undefined) {
            this._startTime = timeMs;
        }
        return this;
    }
    /**
     * Starts the tweening operation.
     * @param {number=} timeMs If set, the tween will start this
     * many milliseconds in the future.
     */
    start(timeMs) {
        if (timeMs !== undefined) {
            this.startTime(timeMs + instance_1.ige.engine._currentTime);
        }
        instance_1.ige.tween.start(this);
        // Add the tween to the target object's tween array
        this._targetObj._tweenArr = this._targetObj._tweenArr || [];
        this._targetObj._tweenArr.push(this);
        return this;
    }
    /**
     * Stops the tweening operation.
     */
    stop() {
        instance_1.ige.tween.stop(this);
        if (this._targetObj._tweenArr) {
            (0, arrays_1.arrPull)(this._targetObj._tweenArr, this);
        }
        return this;
    }
    /**
     * Starts all tweens registered to an object.
     * @private
     */
    startAll() {
        if (this._targetObj._tweenArr) {
            this._targetObj._tweenArr.eachReverse((tweenItem) => {
                tweenItem.start();
            });
        }
        return this;
    }
    /**
     * Stops all tweens registered to an object.
     * @private
     */
    stopAll() {
        if (this._targetObj._tweenArr) {
            this._targetObj._tweenArr.eachReverse((tweenItem) => {
                tweenItem.stop();
            });
        }
        return this;
    }
}
exports.IgeTween = IgeTween;
/**
 * Creates a new IgeTween with the passed parameters that will act upon
 * the object's properties. The returned tween will not start tweening
 * until a call to start() is made.
 * @param {Object} target The target object to tween properties of.
 * @param {Object} [props]
 * @param {number} [durationMs]
 * @param {Object=} [options]
 * @return {IgeTween} A new IgeTween instance.
 */
const createTween = (target, props, durationMs, options) => {
    const newTween = new IgeTween().targetObj(target).properties(props).duration(durationMs);
    if (options) {
        if (options.beforeTween) {
            newTween.beforeTween(options.beforeTween);
        }
        if (options.afterTween) {
            newTween.afterTween(options.afterTween);
        }
        if (options.easing) {
            newTween.easing(options.easing);
        }
        if (options.startTime) {
            newTween.startTime(options.startTime);
        }
    }
    return newTween;
};
exports.createTween = createTween;
