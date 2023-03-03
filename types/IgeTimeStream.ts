/**
 * Transform data is encoded as strings to avoid losing
 * integrity as they are floats, they are parsed when
 * received
 */
export type IgeTimeStreamTransformData = [
	string, string, string, // Translate x,y,z
	string, string, string, // Scale x,y,z
	string, string, string // Rotate x,y,z
];

export type IgeTimeStreamParsedTransformData = [
	number, number, number, // Translate x,y,z
	number, number, number, // Scale x,y,z
	number, number, number // Rotate x,y,z
];

/**
 * Timestream packets are arrays of data in the format:
 * [timestamp, [translate, scale, rotate]]
 * [number, [x, y, z, x, y, z, x, y, z]]
 */
export type IgeTimeStreamPacket = [number, IgeTimeStreamTransformData];
