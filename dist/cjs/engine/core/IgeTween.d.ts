import { IgeBaseClass } from "./IgeBaseClass.js"
import type { IgeTweenEasingFunctions } from "../utils/easing.js";
import { IgeTweenRepeatMode } from "../../enums/IgeTweenRepeatMode.js"
export interface IgeTweenStep {
    props: Record<string, number>;
    durationMs?: number;
    easing?: IgeTweenEasingFunctions;
    isDelta?: boolean;
}
export interface IgeTweenDestination {
    targetObj: any;
    propName: string;
    deltaVal: number;
    oldDelta: number;
}
export type IgeTweenPropertyObject = Record<string, number>;
export interface IgeTweenOptions {
    easing?: IgeTweenEasingFunctions;
    startTime?: number;
    beforeTween?: (...args: any[]) => void;
    afterTween?: (...args: any[]) => void;
}
/**
 * Creates a new tween instance. A tween instance automatically tweens
 * properties over time. The engine must have the tweening component
 * added before you can use IgeTween. You can do this by calling
 * `ige.uses("tweening");` before your call to `ige.init()`.
 *
 * All the actual tweening functionality is calculated and executed
 * in the IgeTweenController (ige.tweening).
 *
 * @example Tween an entity's position
 *      const entity = new IgeEntity();
 *      new IgeTween(entity._translate)
 *          .properties({
 *              x: 500
 *          })
 *          .duration(5000) // 5 seconds
 *          .start();
 */
export declare class IgeTween extends IgeBaseClass {
    classId: string;
    _steps: IgeTweenStep[];
    _targetObj: any;
    _currentStep: number;
    _startTime?: number;
    _selectedEasing: IgeTweenEasingFunctions;
    _endTime: number;
    _targetData: IgeTweenDestination[];
    _destTime: number;
    _started: boolean;
    _durationMs: number;
    _stepDirection: boolean;
    _repeatMode: IgeTweenRepeatMode;
    _repeatCount: number;
    _repeatedCount: number;
    _easing: IgeTweenEasingFunctions;
    _beforeTween?: (...args: any[]) => void;
    _afterTween?: (...args: any[]) => void;
    _beforeStep?: (...args: any[]) => void;
    _afterStep?: (...args: any[]) => void;
    _afterChange?: (...args: any[]) => void;
    constructor(targetObj?: any, propertyObj?: IgeTweenPropertyObject, durationMs?: number, options?: IgeTweenOptions);
    /**
     * Sets the object in which the properties to tween exist.
     * @param targetObj
     * @return {*}
     */
    targetObj(targetObj: any): this;
    /**
     * Sets the tween's target properties to tween to.
     * @param propertyObj
     * @return {*}
     */
    properties(propertyObj?: IgeTweenPropertyObject): this;
    /**
     * Gets / sets the repeat mode for the tween. If the mode
     * is set to 1 the tween will repeat from the first step.
     * If set to 2 the tween will reverse the order of the steps
     * each time the repeat occurs. The count determines the
     * number of times the tween will be repeated before stopping.
     * Setting the count to -1 will make it repeat infinitely.
     * @param val
     * @param count
     * @return {*}
     */
    repeatMode(val: IgeTweenRepeatMode, count?: number): this;
    repeatMode(): IgeTweenRepeatMode;
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
    repeatCount(val?: number): number | this;
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
    stepTo(propertyObj: IgeTweenPropertyObject, durationMs?: number, easing?: IgeTweenEasingFunctions, delta?: boolean): this;
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
    stepBy(propertyObj: IgeTweenPropertyObject, durationMs?: number, easing?: IgeTweenEasingFunctions): this;
    /**
     * Sets the duration of the tween in milliseconds.
     * @param durationMs
     * @return {*}
     */
    duration(durationMs?: number): this;
    /**
     * Sets the method to be called just before the tween has started.
     * @param callback
     * @return {*}
     */
    beforeTween(callback?: (...args: any[]) => void): this;
    /**
     * Sets the method to be called just after the tween has ended.
     * @param callback
     * @return {*}
     */
    afterTween(callback?: (...args: any[]) => void): this;
    /**
     * Sets the method to be called just before a tween step has
     * started.
     * @param callback
     * @return {*}
     */
    beforeStep(callback?: (...args: any[]) => void): this;
    /**
     * Sets the method to be called just after a tween step has
     * ended.
     * @param callback
     * @return {*}
     */
    afterStep(callback?: (...args: any[]) => void): this;
    /**
     * Sets the method to be called just after a tween has changed
     * the values of the target object every update tick.
     * @param callback
     * @return {*}
     */
    afterChange(callback?: (...args: any[]) => void): this;
    /**
     * Gets / sets the name of the easing method to use with the tween.
     * @param {string=} methodName
     * @return {*}
     */
    easing(methodName: IgeTweenEasingFunctions): this;
    easing(): IgeTweenEasingFunctions;
    /**
     * Sets the timestamp at which the tween should start.
     * @param timeMs
     * @return {*}
     */
    startTime(timeMs: number): this;
    /**
     * Starts the tweening operation.
     * @param {number=} timeMs If set, the tween will start this
     * many milliseconds in the future.
     */
    start(timeMs?: number): this;
    /**
     * Stops the tweening operation.
     */
    stop(): this;
    /**
     * Starts all tweens registered to an object.
     * @private
     */
    startAll(): this;
    /**
     * Stops all tweens registered to an object.
     * @private
     */
    stopAll(): this;
}
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
export declare const createTween: (target: any, props: IgeTweenPropertyObject, durationMs: number, options?: IgeTweenOptions) => IgeTween;
