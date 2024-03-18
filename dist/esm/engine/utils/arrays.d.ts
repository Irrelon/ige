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
