import { IgeBaseClass } from "./IgeBaseClass";
import { registerClass } from "@/engine/igeClassStore";

/**
 * Creates a new map that has two dimensions (x and y) to its data.
 */
export class IgeMap2d extends IgeBaseClass {
	classId = "IgeMap2d";
	_mapData: any[][];

	constructor (data?: any[][]) {
		super();
		this._mapData = data || [];
	}

	/**
	 * Gets / sets a value on the specified map tile co-ordinates.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {*=} val The data to set on the map tile co-ordinate.
	 * @return {*}
	 */
	tileData (x?: number, y?: number, val?: any) {
		if (x !== undefined && y !== undefined) {
			if (val !== undefined) {
				// Assign a value
				this._mapData[y] = this._mapData[y] || [];
				this._mapData[y][x] = val;
				return this;
			} else {
				// No assignment so see if we have data to return
				if (this._mapData[y]) {
					return this._mapData[y][x];
				}
			}
		}

		// Either no x, y was specified or there was
		// no data at the x, y so return undefined
		return undefined;
	}

	/**
	 * Clears any data set at the specified map tile co-ordinates.
	 * @param x
	 * @param y
	 * @return {Boolean} True if data was cleared or false if no data existed.
	 */
	clearData (x?: number, y?: number) {
		if (x !== undefined && y !== undefined) {
			if (this._mapData[y] !== undefined) {
				delete this._mapData[y][x];
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if the tile area passed has any data stored in it. If
	 * so, returns true, otherwise false.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 */
	collision (x?: number, y?: number, width?: number, height?: number) {
		let xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (yi = 0; yi < height; yi++) {
				for (xi = 0; xi < width; xi++) {
					if (this.tileData(x + xi, y + yi)) {
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Checks if the tile area passed has data stored in it that matches
	 * the passed data. If so, returns true, otherwise false.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 * @param data
	 */
	collisionWith (x?: number, y?: number, width?: number, height?: number, data?: any) {
		let xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (yi = 0; yi < height; yi++) {
				for (xi = 0; xi < width; xi++) {
					if (this.tileData(x + xi, y + yi) === data) {
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Checks if the tile area passed has data stored in it that matches
	 * the passed data and does not collide with any other stored tile
	 * data. If so, returns true, otherwise false.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 * @param data
	 */
	collisionWithOnly (x?: number, y?: number, width?: number, height?: number, data?: any) {
		let xi, yi,
			tileData,
			withData = false;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (yi = 0; yi < height; yi++) {
				for (xi = 0; xi < width; xi++) {
					tileData = this.tileData(x + xi, y + yi);
					if (tileData) {
						if (this.tileData(x + xi, y + yi) === data) {
							withData = true;
						} else {
							return false;
						}
					}
				}
			}
		}

		return withData;
	}

	/**
	 * Gets / sets the map's tile data.
	 * @param val The map data array.
	 * @param startX The start x co-ordinate of the data.
	 * @param startY The start y co-ordinate of the data.
	 * @return {*}
	 */
	mapData (val: number[][], startX: number, startY: number): this;
	mapData (val: number[][]): this;
	mapData (): number[][];
	mapData (val?: number[][], startX?: number, startY?: number) {
		if (val === undefined) {
			return this._mapData;
		}

		if (!startX || !startY) {
			this._mapData = val;
			return this;
		}

		// Loop the map data and apply based on the start positions
		for (let y = 0; y < val.length; y++) {
			for (let x = 0; x < val[y].length; x++) {
				this._mapData[startY + y][startX + x] = val[y][x];
			}
		}

		return this;
	}

	sortedMapDataAsArray () {
		const data = this.mapData();
		const finalData: number[][] = [];

		const yArr = this._sortKeys(data);

		for (let i = 0; i < yArr.length; i++) {
			const y = yArr[i];
			const xArr = this._sortKeys(data[y as unknown as number]);

			finalData[y as unknown as number] = finalData[y as unknown as number] || {};

			for (let k = 0; k < xArr.length; k++) {
				const x = xArr[k];
				finalData[y as unknown as number][x as unknown as number] = data[y as unknown as number][x as unknown as number];
			}
		}

		return finalData;
	}

	_sortKeys (obj: Record<string, any>) {
		return Object.keys(obj).sort();
	}

	/**
	 * Returns a string of the map's data in JSON format.
	 * @return {String}
	 */
	mapDataString () {
		return JSON.stringify(this.mapData());
	}

	translateDataBy (transX: number, transY: number) {
		const yArr = this.mapData();
		const newArr: number[][] = [];

		for (let y = 0; y < yArr.length; y++) {
			const xArr = yArr[y];
			newArr[y + transY] = newArr[y + transY] || [];

			for (let x = 0; x < xArr.length; x++) {
				newArr[y + transY][x + transX] = yArr[y][x];
			}
		}

		this.mapData(newArr, 0, 0);
	}
}


registerClass(IgeMap2d);
