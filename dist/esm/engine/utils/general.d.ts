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
 * Returns a promise that resolves in the given milliseconds.
 * @param ms
 */
export declare const delay: (ms: number) => Promise<unknown>;
/**
 * Gets the bounding rectangle for the passed HTML element.
 * Uses DOM methods.
 */
export declare const getElementPosition: (elem?: HTMLElement) => DOMRect | {
    top: number;
    left: number;
};
