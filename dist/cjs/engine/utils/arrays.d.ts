/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param item
 * @return {number} The array item that was removed
 */
export declare const arrPull: (arr: any[], item: any) => any;
/**
 * Removes the passed item from an array, the opposite of push().
 * @param arr
 * @param func
 * @return {number} The array index that was removed
 */
export declare const arrPullConditional: (arr: any[], func: (item: any) => boolean) => any;
/**
 * Adds an item to an array, only if it does not already exist in the array.
 * @param arr
 * @param item
 * @return {boolean} True if the item was added, false if it already exists.
 */
export declare const pushUnique: (arr: any[], item: any) => boolean;
/**
 * Clones the array and returns a new non-referenced
 * array. Object references for items inside the array
 * are kept but any array inside the array is converted
 * to a non-referenced version. Essentially, you can be
 * sure that any modification to any array in the return
 * data will not affect the original array or sub-arrays
 * of the original array.
 * @param arr
 * @return {*}
 */
export declare const arrClone: <ArrType = any>(arr: ArrType[]) => ArrType[];
