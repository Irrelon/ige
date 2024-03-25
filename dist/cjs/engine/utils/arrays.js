"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrClone = exports.pushUnique = exports.arrPullConditional = exports.arrPull = void 0;
/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param item
 * @return {number} The array item that was removed
 */
const arrPull = (arr, item) => {
    const index = arr.indexOf(item);
    if (index > -1) {
        return arr.splice(index, 1);
    }
};
exports.arrPull = arrPull;
/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param func
 * @return {number} The array index that was removed
 */
const arrPullConditional = (arr, func) => {
    const index = arr.findIndex(func);
    if (index > -1) {
        return arr.splice(index, 1);
    }
};
exports.arrPullConditional = arrPullConditional;
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
