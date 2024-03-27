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
export declare const toIso: (x: number, y: number, z: number) => {
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
