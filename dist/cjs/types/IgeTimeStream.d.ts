/**
 * Transform data is encoded as strings to avoid losing
 * integrity as they are floats, they are parsed when
 * received
 */
export type IgeTimeStreamTransformData = [string, string, string, string, string, string, string, string, string];
export type IgeTimeStreamParsedTransformData = [number, number, number, number, number, number, number, number, number];
/**
 * Timestream packets are arrays of data in the format:
 * [timestamp, [translate, scale, rotate]]
 * [number, [x, y, z, x, y, z, x, y, z]]
 */
export type IgeTimeStreamPacket = [number, IgeTimeStreamTransformData];
