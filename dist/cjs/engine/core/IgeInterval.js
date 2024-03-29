"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeInterval = void 0;
const IgeEventingClass_1 = require("./IgeEventingClass.js");
const instance_1 = require("../instance.js");
/**
 * Provides a kind of setInterval() that works based on the engine's internal
 * time system allowing intervals to fire correctly, taking into account pausing
 * the game and differences in rendering speed etc.
 */
class IgeInterval extends IgeEventingClass_1.IgeEventingClass {
    /**
     * Creates a new timer that will call the method every given number of
     * milliseconds specified by the interval parameter.
     * @param {IgeIntervalCallback} method The method to call each interval.
     * @param {number} interval The number of milliseconds between each interval.
     * @param {boolean} [catchup=true] If true, the interval will fire multiple times
     * retrospectively when the engine jumps in time. If false, the interval will
     * only fire a single time even if a large period of engine time has elapsed.
     */
    constructor(method, interval, catchup = true) {
        super();
        this.classId = "IgeInterval";
        this._method = method;
        this._interval = interval;
        this._time = 0;
        this._started = instance_1.ige.engine._currentTime;
        this._catchup = catchup;
        // Attach ourselves to the time system
        instance_1.ige.time.addTimer(this);
    }
    /**
     * Adds time to the timer's internal clock.
     * @param {number} time The time in milliseconds to add to the timer's internal clock.
     * @returns {*}
     */
    addTime(time) {
        this._time += time;
        return this;
    }
    /**
     * Cancels the timer stopping all future method calls.
     * @returns {*}
     */
    cancel() {
        instance_1.ige.time.removeTimer(this);
        return this;
    }
    /**
     * Checks for a timer event to see if we should call the timer method. This is
     * called automatically by the IgeTimeController class and does not need to be
     * called manually.
     * @returns {*}
     */
    update() {
        let intendedTime;
        const overTime = this._time - this._interval;
        if (overTime > 0) {
            intendedTime = instance_1.ige.engine._currentTime - overTime;
            // Fire an interval
            this._method(instance_1.ige.engine._currentTime, intendedTime);
            if (this._catchup) {
                this._time -= this._interval;
            }
            else {
                this._time = 0;
            }
        }
        return this;
    }
}
exports.IgeInterval = IgeInterval;
