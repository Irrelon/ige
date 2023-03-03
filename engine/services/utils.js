/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param item
 * @return {number} The array index that was removed
 */
export const arrPull = (arr, item) => {
    const index = arr.indexOf(item);
    if (index > -1) {
        arr.splice(index, 1);
        return index;
    }
    else {
        return -1;
    }
};
/**
 * Adds an item to an array, only if it does not already exist in the array.
 * @param arr
 * @param item
 * @return {Boolean} True if the item was added, false if it already exists.
 */
export const pushUnique = (arr, item) => {
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
export const arrClone = (arr) => {
    const newArray = [];
    for (const i in arr) {
        if (arr.hasOwnProperty(i)) {
            if (arr[i] instanceof Array) {
                newArray[i] = arrClone(arr[i]);
            }
            else {
                newArray[i] = arr[i];
            }
        }
    }
    return newArray;
};
export const mixin = (targetObject, mixinObj, overwrite = false) => {
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
export const theSameAs = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};
/**
 * Iterates through an array's items and calls each item's
 * destroy() method if it exists. Useful for destroying an
 * array of IgeEntity instances.
 */
export const destroyAll = (arr) => {
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
export const toIso = (x, y, z) => {
    const sx = x - y;
    const sy = -z * 1.2247 + (x + y) * 0.5;
    return { x: sx, y: sy };
};
/**
 * Converts degrees to radians.
 * @param {Number} degrees
 * @return {Number} radians
 */
export const degreesToRadians = (degrees) => {
    return degrees * PI180;
};
/**
 * Converts radians to degrees.
 * @param {Number} radians
 * @return {Number} degrees
 */
export const radiansToDegrees = (radians) => {
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
export const distance = (x1, y1, x2, y2) => {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
};
