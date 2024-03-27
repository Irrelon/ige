"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distance = exports.radiansToDegrees = exports.degreesToRadians = exports.toIso = exports.PI2 = exports.PI180R = exports.PI180 = void 0;
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
