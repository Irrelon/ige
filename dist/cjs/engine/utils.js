"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElementPosition = exports.delay = exports.traceSetOff = exports.traceSet = exports.newIdHex = exports.newId = exports.newIdNumber = exports.distance = exports.radiansToDegrees = exports.degreesToRadians = exports.toIso = exports.PI2 = exports.PI180R = exports.PI180 = exports.destroyAll = exports.theSameAs = exports.mixin = exports.arrClone = exports.pushUnique = exports.arrPull = void 0;
let _idCounter = 0;
/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param item
 * @return {number} The array index that was removed
 */
const arrPull = (arr, item) => {
    const index = arr.indexOf(item);
    if (index > -1) {
        arr.splice(index, 1);
        return index;
    }
    else {
        return -1;
    }
};
exports.arrPull = arrPull;
/**
 * Adds an item to an array, only if it does not already exist in the array.
 * @param arr
 * @param item
 * @return {boolean} True if the item was added, false if it already exists.
 */
const pushUnique = (arr, item) => {
    const index = arr.indexOf(item);
    if (index > -1) {
        return false;
    }
    arr.push(item);
    return true;
};
exports.pushUnique = pushUnique;
/**
 * Clones the array and returns a new non-referenced
 * array.
 * @param arr
 * @return {*}
 */
const arrClone = (arr) => {
    const newArray = [];
    for (const i in arr) {
        if (arr.hasOwnProperty(i)) {
            if (arr[i] instanceof Array) {
                newArray[i] = (0, exports.arrClone)(arr[i]);
            }
            else {
                newArray[i] = arr[i];
            }
        }
    }
    return newArray;
};
exports.arrClone = arrClone;
const mixin = (targetObject, mixinObj, overwrite = false) => {
    const obj = mixinObj.prototype || mixinObj;
    // Copy the class object's properties to (this)
    for (const key in obj) {
        // Only copy the property if this doesn't already have it
        // @ts-ignore
        if (Object.prototype.hasOwnProperty.call(obj, key) && (overwrite || targetObject[key] === undefined)) {
            // @ts-ignore
            targetObject[key] = obj[key];
        }
    }
};
exports.mixin = mixin;
/**
 * Checks if the
 * property values of this object are equal to the property values
 * of the passed object. If they are the same then this method will
 * return true. Objects must not contain circular references!
 * @param {Object} obj1 The first object to compare to.
 * @param {Object} obj2 The other object to compare to.
 * @return {boolean}
 */
const theSameAs = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};
exports.theSameAs = theSameAs;
/**
 * Iterates through an array's items and calls each item's
 * destroy() method if it exists. Useful for destroying an
 * array of IgeEntity instances.
 */
const destroyAll = (arr) => {
    const arrCount = arr.length;
    for (let i = arrCount - 1; i >= 0; i--) {
        if (typeof arr[i].destroy === "function") {
            arr[i].destroy();
        }
    }
};
exports.destroyAll = destroyAll;
/**
 * Stores a pre-calculated PI / 180 value.
 * @type {number}
 */
exports.PI180 = Math.PI / 180;
/**
 * Stores a pre-calculated 180 / PI value.
 * @type {number}
 */
exports.PI180R = 180 / Math.PI;
exports.PI2 = Math.PI * 2;
const toIso = (x, y, z) => {
    const sx = x - y;
    const sy = -z * 1.2247 + (x + y) * 0.5;
    return { x: sx, y: sy };
};
exports.toIso = toIso;
/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @return {number} radians
 */
const degreesToRadians = (degrees) => {
    return degrees * exports.PI180;
};
exports.degreesToRadians = degreesToRadians;
/**
 * Converts radians to degrees.
 * @param {number} radians
 * @return {number} degrees
 */
const radiansToDegrees = (radians) => {
    return radians * exports.PI180R;
};
exports.radiansToDegrees = radiansToDegrees;
/**
 * Calculates the distance from the first point to the second point.
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @return {number}
 */
const distance = (x1, y1, x2, y2) => {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
};
exports.distance = distance;
/**
 * Generates a new unique ID as a number.
 * @return {number}
 */
const newIdNumber = () => {
    _idCounter++;
    return (_idCounter +
        (Math.random() * Math.pow(10, 17) +
            Math.random() * Math.pow(10, 17) +
            Math.random() * Math.pow(10, 17) +
            Math.random() * Math.pow(10, 17)));
};
exports.newIdNumber = newIdNumber;
/**
 * Generates a new unique ID string
 * @return {string}
 */
const newId = () => {
    _idCounter++;
    return (0, exports.newIdNumber)().toString();
};
exports.newId = newId;
/**
 * Generates a new 16-character hexadecimal unique ID
 * @return {string}
 */
const newIdHex = () => {
    return (0, exports.newIdNumber)().toString(16);
};
exports.newIdHex = newIdHex;
/**
 * Sets a trace up on the setter of the passed object's
 * specified property. When the property is set by any
 * code the debugger line is activated and code execution
 * will be paused allowing you to step through code or
 * examine the call stack to see where the property set
 * originated.
 * @param {Object} obj The object whose property you want
 * to trace.
 * @param {string} propName The name of the property you
 * want to put the trace on.
 * @param {number} sampleCount The number of times you
 * want the trace to break with the debugger line before
 * automatically switching off the trace.
 * @param {Function=} callbackEvaluator Optional callback
 * that if returns true, will fire debugger. Method is passed
 * the setter value as first argument.
 */
const traceSet = (obj, propName, sampleCount, callbackEvaluator) => {
    obj.___igeTraceCurrentVal = obj.___igeTraceCurrentVal || {};
    obj.___igeTraceCurrentVal[propName] = obj[propName];
    obj.___igeTraceMax = sampleCount || 1;
    obj.___igeTraceCount = 0;
    Object.defineProperty(obj, propName, {
        get() {
            return obj.___igeTraceCurrentVal[propName];
        },
        set: (val) => {
            if (callbackEvaluator) {
                if (callbackEvaluator(val)) {
                    debugger; // jshint ignore:line
                }
            }
            else {
                debugger; // jshint ignore:line
            }
            obj.___igeTraceCurrentVal[propName] = val;
            obj.___igeTraceCount++;
            if (obj.___igeTraceCount === obj.___igeTraceMax) {
                // Maximum amount of trace samples reached, turn off
                // the trace system
                (0, exports.traceSetOff)(obj, propName);
            }
        }
    });
};
exports.traceSet = traceSet;
/**
 * Turns off a trace that was created by calling traceSet.
 * @param {Object} obj The object whose property you want
 * to disable a trace against.
 * @param {string} propName The name of the property you
 * want to disable the trace for.
 */
const traceSetOff = (obj, propName) => {
    Object.defineProperty(obj, propName, {
        set(val) {
            this.___igeTraceCurrentVal[propName] = val;
        }
    });
};
exports.traceSetOff = traceSetOff;
/**
 * Returns a promise that resolves in the given milliseconds.
 * @param ms
 */
const delay = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};
exports.delay = delay;
/**
 * Gets the bounding rectangle for the passed HTML element.
 * Uses DOM methods.
 */
const getElementPosition = (elem) => {
    if (!elem) {
        return {
            top: 0,
            left: 0
        };
    }
    try {
        return elem.getBoundingClientRect();
    }
    catch (e) {
        return {
            top: elem.offsetTop,
            left: elem.offsetLeft
        };
    }
};
exports.getElementPosition = getElementPosition;
