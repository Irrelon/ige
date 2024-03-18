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
 * @return {boolean} True if the item was added, false if it already exists.
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
