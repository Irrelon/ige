import type { IgeBaseClass } from "@/engine/core/IgeBaseClass";

/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param item
 * @return {number} The array index that was removed
 */
export declare const arrPull: (arr: any[], item: any) => number;
/**
 * Adds an item to an array, only if it does not already exist in the array.
 * @param arr
 * @param item
 * @return {boolean} True if the item was added, false if it already exists.
 */
export declare const pushUnique: (arr: any[], item: any) => boolean;
/**
 * Clones the array and returns a new non-referenced
 * array.
 * @param arr
 * @return {*}
 */
export declare const arrClone: (arr: any[]) => any[];
export declare const mixin: (targetObject: IgeBaseClass, mixinObj: any, overwrite?: boolean) => void;
/**
 * Checks if the
 * property values of this object are equal to the property values
 * of the passed object. If they are the same then this method will
 * return true. Objects must not contain circular references!
 * @param {Object} obj1 The first object to compare to.
 * @param {Object} obj2 The other object to compare to.
 * @return {boolean}
 */
export declare const theSameAs: (obj1: any, obj2: any) => boolean;
/**
 * Iterates through an array's items and calls each item's
 * destroy() method if it exists. Useful for destroying an
 * array of IgeEntity instances.
 */
export declare const destroyAll: (arr: any[]) => void;
/**
 * Stores a pre-calculated PI / 180 value.
 * @type {number}
 */
export declare const PI180: number;
/**
 * Stores a pre-calculated 180 / PI value.
 * @type {number}
 */
export declare const PI180R: number;
export declare const PI2: number;
export declare const toIso: (
	x: number,
	y: number,
	z: number
) => {
	x: number;
	y: number;
};
/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @return {number} radians
 */
export declare const degreesToRadians: (degrees: number) => number;
/**
 * Converts radians to degrees.
 * @param {number} radians
 * @return {number} degrees
 */
export declare const radiansToDegrees: (radians: number) => number;
/**
 * Calculates the distance from the first point to the second point.
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @return {number}
 */
export declare const distance: (x1: number, y1: number, x2: number, y2: number) => number;
/**
 * Generates a new unique ID as a number.
 * @return {number}
 */
export declare const newIdNumber: () => number;
/**
 * Generates a new unique ID string
 * @return {string}
 */
export declare const newId: () => string;
/**
 * Generates a new 16-character hexadecimal unique ID
 * @return {string}
 */
export declare const newIdHex: () => string;
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
export declare const traceSet: (
	obj: any,
	propName: string,
	sampleCount: number,
	callbackEvaluator?: ((val: any) => boolean) | undefined
) => void;
/**
 * Turns off a trace that was created by calling traceSet.
 * @param {Object} obj The object whose property you want
 * to disable a trace against.
 * @param {string} propName The name of the property you
 * want to disable the trace for.
 */
export declare const traceSetOff: (obj: any, propName: string) => void;
/**
 * Returns a promise that resolves in the given milliseconds.
 * @param ms
 */
export declare const delay: (ms: number) => Promise<unknown>;
