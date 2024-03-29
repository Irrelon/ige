/**
 * Stores a pre-calculated PI / 180 value.
 * @type {number}
 */
export const PI180: number = Math.PI / 180;

/**
 * Stores a pre-calculated 180 / PI value.
 * @type {number}
 */
export const PI180R: number = 180 / Math.PI;

export const PI2: number = Math.PI * 2;

export const toIso = (x: number, y: number, z: number) => {
	const sx = x - y;
	const sy = -z * 1.2247 + (x + y) * 0.5;

	return { x: sx, y: sy };
};

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @return {number} radians
 */
export const degreesToRadians = (degrees: number): number => {
	return degrees * PI180;
};

/**
 * Converts radians to degrees.
 * @param {number} radians
 * @return {number} degrees
 */
export const radiansToDegrees = (radians: number): number => {
	return radians * PI180R;
};

/**
 * Calculates the distance from the first point to the second point.
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @return {number}
 */
export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
};
