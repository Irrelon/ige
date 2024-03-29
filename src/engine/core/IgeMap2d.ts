import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { registerClass } from "@/engine/utils/igeClassStore";

/**
 * Creates a new map that has two dimensions (x and y) to its data.
 */
export class IgeMap2d<MapDataType = any> extends IgeBaseClass {
	classId = "IgeMap2d";
	_mapData: MapDataType[][];

	constructor (data?: MapDataType[][]) {
		super();
		this._mapData = data || [];
	}

	/**
	 * Gets / sets a value on the specified map tile co-ordinates.
	 * @param {number} x
	 * @param {number} y
	 * @param {*=} val The data to set on the map tile co-ordinate.
	 * @return {*}
	 */
	tileData (x: number, y: number, val: MapDataType): this;
	tileData (x: number, y: number): MapDataType;
	tileData (): undefined;
	tileData (x?: number, y?: number, val?: MapDataType) {
		if ((x === undefined || y === undefined)) {
			return;
		}

		if (val !== undefined) {
			// Assign a value
			this._mapData[y] = this._mapData[y] || [];
			this._mapData[y][x] = val;
			return this;
		}

		// No assignment so see if we have data to return
		if (this._mapData[y]) {
			return this._mapData[y][x];
		}
	}

	/**
	 * Clears any data set at the specified map tile co-ordinates.
	 * @param x
	 * @param y
	 * @return {boolean} True if data was cleared or false if no data existed.
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
		let xi: number, yi: number;

		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

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
	collisionWith (x?: number, y?: number, width?: number, height?: number, data?: MapDataType) {
		let xi: number, yi: number;

		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

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
	collisionWithOnly (x?: number, y?: number, width?: number, height?: number, data?: MapDataType) {
		let xi: number,
			yi: number,
			tileData: MapDataType,
			withData = false;

		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

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
	mapData (val: MapDataType[][], startX: number, startY: number): this;
	mapData (val: MapDataType[][]): this;
	mapData (): MapDataType[][];
	mapData (val?: MapDataType[][], startX?: number, startY?: number) {
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
		const finalData: MapDataType[][] = [];

		const yArr = this._sortKeys(data);

		for (let i = 0; i < yArr.length; i++) {
			const y = yArr[i];
			const xArr = this._sortKeys(data[y as unknown as number]);

			finalData[y as unknown as number] = finalData[y as unknown as number] || [];

			for (let k = 0; k < xArr.length; k++) {
				const x = xArr[k];
				finalData[y as unknown as number][x as unknown as number] =
					data[y as unknown as number][x as unknown as number];
			}
		}

		return finalData;
	}

	_sortKeys (obj: Record<string, any>) {
		return Object.keys(obj).sort();
	}

	/**
	 * Returns a string of the map's data in JSON format.
	 * @return {string}
	 */
	mapDataString () {
		return JSON.stringify(this.mapData());
	}

	translateDataBy (transX: number, transY: number) {
		const yArr = this.mapData();
		const newArr: MapDataType[][] = [];

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
