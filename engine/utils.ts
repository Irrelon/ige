import type { IgeBaseClass } from "@/engine/core/IgeBaseClass";

let _idCounter = 0;

/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param item
 * @return {number} The array index that was removed
 */
export const arrPull = (arr: any[], item: any): number => {
	const index = arr.indexOf(item);

	if (index > -1) {
		arr.splice(index, 1);
		return index;
	} else {
		return -1;
	}
};

/**
 * Adds an item to an array, only if it does not already exist in the array.
 * @param arr
 * @param item
 * @return {Boolean} True if the item was added, false if it already exists.
 */
export const pushUnique = (arr: any[], item: any): boolean => {
	const index = arr.indexOf(item);

	if (index > -1) {
		return false;
	}

	arr.push(item);
	return true;
};

/**
 * Clones the array and returns a new non-referenced
 * array.
 * @param arr
 * @return {*}
 */
export const arrClone = (arr: any[]) => {
	const newArray: any[] = [];

	for (const i in arr) {
		if (arr.hasOwnProperty(i)) {
			if (arr[i] instanceof Array) {
				newArray[i] = arrClone(arr[i]);
			} else {
				newArray[i] = arr[i];
			}
		}
	}

	return newArray;
};

export const mixin = (targetObject: IgeBaseClass, mixinObj: any, overwrite = false) => {
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

/**
 * Checks if the
 * property values of this object are equal to the property values
 * of the passed object. If they are the same then this method will
 * return true. Objects must not contain circular references!
 * @param {Object} obj1 The first object to compare to.
 * @param {Object} obj2 The other object to compare to.
 * @return {Boolean}
 */
export const theSameAs = (obj1: any, obj2: any): boolean => {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
};

/**
 * Iterates through an array's items and calls each item's
 * destroy() method if it exists. Useful for destroying an
 * array of IgeEntity instances.
 */
export const destroyAll = (arr: any[]) => {
	const arrCount = arr.length;

	for (let i = arrCount - 1; i >= 0; i--) {
		if (typeof arr[i].destroy === "function") {
			arr[i].destroy();
		}
	}
};

/**
 * Stores a pre-calculated PI / 180 value.
 * @type {Number}
 */
export const PI180 = Math.PI / 180;

/**
 * Stores a pre-calculated 180 / PI value.
 * @type {Number}
 */
export const PI180R = 180 / Math.PI;

export const toIso = (x: number, y: number, z: number) => {
	const sx = x - y;
	const sy = -z * 1.2247 + (x + y) * 0.5;

	return { x: sx, y: sy };
};

/**
 * Converts degrees to radians.
 * @param {Number} degrees
 * @return {Number} radians
 */
export const degreesToRadians = (degrees: number) => {
	return degrees * PI180;
};

/**
 * Converts radians to degrees.
 * @param {Number} radians
 * @return {Number} degrees
 */
export const radiansToDegrees = (radians: number) => {
	return radians * PI180R;
};

/**
 * Calculates the distance from the first point to the second point.
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @return {Number}
 */
export const distance = (x1: number, y1: number, x2: number, y2: number) => {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
};

/**
 * Generates a new unique ID as a number.
 * @return {number}
 */
export const newIdNumber = (): number => {
	_idCounter++;
	return (
		_idCounter +
		(Math.random() * Math.pow(10, 17) +
			Math.random() * Math.pow(10, 17) +
			Math.random() * Math.pow(10, 17) +
			Math.random() * Math.pow(10, 17))
	);
}

/**
 * Generates a new unique ID string
 * @return {string}
 */
export const newId = (): string => {
	_idCounter++;
	return newIdNumber().toString();
}

/**
 * Generates a new 16-character hexadecimal unique ID
 * @return {String}
 */
export const newIdHex = () => {
	return newIdNumber().toString(16);
};

/**
 * Sets a trace up on the setter of the passed object's
 * specified property. When the property is set by any
 * code the debugger line is activated and code execution
 * will be paused allowing you to step through code or
 * examine the call stack to see where the property set
 * originated.
 * @param {Object} obj The object whose property you want
 * to trace.
 * @param {String} propName The name of the property you
 * want to put the trace on.
 * @param {Number} sampleCount The number of times you
 * want the trace to break with the debugger line before
 * automatically switching off the trace.
 * @param {Function=} callbackEvaluator Optional callback
 * that if returns true, will fire debugger. Method is passed
 * the setter value as first argument.
 */
export const traceSet = (obj: any, propName: string, sampleCount: number, callbackEvaluator?: (val: any) => boolean) => {
	obj.___igeTraceCurrentVal = obj.___igeTraceCurrentVal || {};
	obj.___igeTraceCurrentVal[propName] = obj[propName];
	obj.___igeTraceMax = sampleCount || 1;
	obj.___igeTraceCount = 0;

	Object.defineProperty(obj, propName, {
		get () {
			return obj.___igeTraceCurrentVal[propName];
		},
		set: (val) => {
			if (callbackEvaluator) {
				if (callbackEvaluator(val)) {
					debugger; // jshint ignore:line
				}
			} else {
				debugger; // jshint ignore:line
			}

			obj.___igeTraceCurrentVal[propName] = val;
			obj.___igeTraceCount++;

			if (obj.___igeTraceCount === obj.___igeTraceMax) {
				// Maximum amount of trace samples reached, turn off
				// the trace system
				traceSetOff(obj, propName);
			}
		}
	});
}

/**
 * Turns off a trace that was created by calling traceSet.
 * @param {Object} obj The object whose property you want
 * to disable a trace against.
 * @param {String} propName The name of the property you
 * want to disable the trace for.
 */
export const traceSetOff = (obj: any, propName: string) => {
	Object.defineProperty(obj, propName, {
		set (val) {
			this.___igeTraceCurrentVal[propName] = val;
		}
	});
}

/**
 * Returns a promise that resolves in the given milliseconds.
 * @param ms
 */
export const delay = (ms: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
