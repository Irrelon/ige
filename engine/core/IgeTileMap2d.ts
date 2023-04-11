import { ige } from "../instance";
import { IgeTexture } from "./IgeTexture";
import { IgeTileMap2dSmartTexture } from "../textures/IgeTileMap2dSmartTexture";
import { IgeMap2d } from "./IgeMap2d";
import { IgeMatrix2d } from "./IgeMatrix2d";
import { IgePoint2d } from "./IgePoint2d";
import { IgeRect } from "./IgeRect";
import { IgePoint3d } from "./IgePoint3d";
import { IgePoly2d } from "./IgePoly2d";
import { isServer } from "../clientServer";
import { IgeMountMode } from "@/enums/IgeMountMode";
import { arrClone, newIdHex } from "../utils";
import { IgeEntity } from "./IgeEntity";
import { IgeObject } from "./IgeObject";
import { registerClass } from "@/engine/igeClassStore";

export type IgeTileMap2dScanRectCallback = (mapData: any, x: number, y: number) => boolean;

export interface IgeTileMap2dSavedMap {
	data: any[][];
	dataXY: [number, number];
}

/**
 * Tile maps provide a way to align mounted child objects to a tile-based grid.
 * NOTE: These are not to be confused with IgeTextureMap's which allow you to
 * paint a bunch of tiles to a grid.
 */
export class IgeTileMap2d extends IgeEntity {
	classId = "IgeTileMap2d";
	IgeTileMap2d = true;
	_drawGrid?: boolean;
	_highlightOccupied: boolean = false;
	_highlightTileRect?: {x: number, y: number, width: number, height: number} = undefined;
	_gridColor?: string;
	_gridSize: IgePoint2d = new IgePoint2d(40, 40);
	_hoverColor?: string;
	map: IgeMap2d;

	constructor (tileWidth?: number, tileHeight?: number) {
		super();

		tileWidth = tileWidth !== undefined ? tileWidth : 40;
		tileHeight = tileHeight !== undefined ? tileHeight : 40;

		if (!isServer) {
			const tex = new IgeTexture(newIdHex(), IgeTileMap2dSmartTexture);
			this.texture(tex);
		}

		this.map = new IgeMap2d();
		this._adjustmentMatrix = new IgeMatrix2d();

		this.tileWidth(tileWidth);
		this.tileHeight(tileHeight);
		this.gridSize(3, 3);

		this._drawGrid = false;
		this._gridColor = "#ffffff";
	}

	/**
	 * Gets / sets the flag that determines if the tile map will paint the
	 * occupied tiles with an overlay colour so that it is easy to spot them.
	 * @param val
	 * @return {*}
	 */
	highlightOccupied(val: boolean): this;
	highlightOccupied(): boolean
	highlightOccupied (val?: boolean) {
		if (val !== undefined) {
			this._highlightOccupied = val;
			return this;
		}

		return this._highlightOccupied;
	}

	highlightTileRect(val: {x: number, y: number, width: number, height: number}): this;
	highlightTileRect(): {x: number, y: number, width: number, height: number}
	highlightTileRect (val?: {x: number, y: number, width: number, height: number}) {
		if (val !== undefined) {
			this._highlightTileRect = val;
			return this;
		}

		return this._highlightTileRect;
	}

	/**
	 * Gets / sets the map's tile width.
	 * @param {number} val Tile width.
	 * @return {*}
	 */
	tileWidth(val: number): this;
	tileWidth(): number;
	tileWidth (val?: number) {
		if (val !== undefined) {
			this._tileWidth = val;
			if (this._gridSize && this._gridSize.x) {
				this.width(this._tileWidth * this._gridSize.x);
				if (this._updateAdjustmentMatrix) {
					this._updateAdjustmentMatrix();
				}
			}

			return this;
		}

		return this._tileWidth;
	}

	/**
	 * Gets / sets the map's tile height.
	 * @param {number} val Tile height.
	 * @return {*}
	 */
	tileHeight(val: number): this;
	tileHeight(): number;
	tileHeight (val?: number) {
		if (val !== undefined) {
			this._tileHeight = val;
			if (this._gridSize && this._gridSize.y) {
				this.height(this._tileHeight * this._gridSize.y);
				if (this._updateAdjustmentMatrix) {
					this._updateAdjustmentMatrix();
				}
			}

			return this;
		}

		return this._tileHeight;
	}

	gridSize(x: number, y: number): this;
	gridSize(): IgePoint2d;
	gridSize (x?: number, y?: number) {
		if (x !== undefined && y !== undefined) {
			this._gridSize = new IgePoint2d(x, y);

			// If in 2d mount mode
			if (this._mountMode === IgeMountMode.flat) {
				if (this._tileWidth) {
					this.width(this._tileWidth * this._gridSize.x);
				}
			}

			// If in isometric mount mode
			if (this._mountMode === IgeMountMode.iso) {
				if (this._tileWidth) {
					this.width((this._tileWidth * 2) * this._gridSize.x);
				}
			}

			if (this._tileHeight) {
				this.height(this._tileHeight * this._gridSize.y);
			}

			this._updateAdjustmentMatrix();

			return this;
		}

		return this._gridSize;
	}

	/**
	 * Gets / sets if the tile map should paint a grid to the context during
	 * the tick method.
	 * @param {Boolean=} val If true, will paint the grid on tick.
	 * @return {*}
	 */
	drawGrid(val: boolean): this;
	drawGrid(): boolean;
	drawGrid (val?: boolean) {
		if (val !== undefined) {
			this._drawGrid = val;
			return this;
		}

		return this._drawGrid;
	}

	/**
	 * Gets / sets the color of the grid overlay. It accepts a string color
	 * definition with the same specifications as the canvas context strokeStyle
	 * property.
	 * @param {string=} val The color of the grid.
	 * @return {*}
	 */
	gridColor (val?: string) {
		if (val !== undefined) {
			this._gridColor = val;
			return this;
		}

		return this._gridColor;
	}

	/**
	 * Sets a tile or area as occupied by the passed obj parameter.
	 * Any previous occupy data on the specified tile or area will be
	 * overwritten.
	 * @param {number} x X co-ordinate of the tile to un-occupy.
	 * @param {number} y Y co-ordinate of the tile to un-occupy.
	 * @param {number} width Number of tiles along the x-axis to occupy.
	 * @param {number} height Number of tiles along the y-axis to occupy.
	 * @param {*} obj
	 * @return {*}
	 */
	occupyTile (x?: number, y?: number, width?: number, height?: number, obj?: any) {
		if (!(x !== undefined && y !== undefined)) {
			return this;
		}

		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		for (let xi = 0; xi < width; xi++) {
			for (let yi = 0; yi < height; yi++) {
				this.map.tileData(x + xi, y + yi, obj);
			}
		}

		// Create an IgeRect to represent the tiles this
		// entity has just occupied
		if (obj.classId) {
			obj._occupiedRect = new IgeRect(x, y, width, height);
		}

		return this;
	}

	/**
	 * Removes all data from the specified tile or area.
	 * @param {number} x
	 * @param {number} y
	 * @param {number=} width
	 * @param {number=} height
	 * @return {*}
	 */
	unOccupyTile (x?: number, y?: number, width?: number, height?: number) {
		if (!(x !== undefined && y !== undefined)) {
			return this;
		}

		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

		// Floor the values
		x = Math.floor(x);
		y = Math.floor(y);
		width = Math.floor(width);
		height = Math.floor(height);

		for (let xi = 0; xi < width; xi++) {
			for (let yi = 0; yi < height; yi++) {
				const item = this.map.tileData(x + xi, y + yi);

				if (item && item._occupiedRect) {
					delete item._occupiedRect;
				}

				this.map.clearData(x + xi, y + yi);
			}
		}

		return this;
	}

	/**
	 * Returns true if the specified tile or tile area has
	 * an occupied status.
	 * @param {number} x
	 * @param {number} y
	 * @param {number=} width
	 * @param {number=} height
	 * @return {*}
	 */
	isTileOccupied (x: number, y: number, width?: number, height?: number) {
		if (width === undefined) {
			width = 1;
		}
		if (height === undefined) {
			height = 1;
		}

		return this.map.collision(x, y, width, height);
	}

	tileOccupiedBy (x: number, y: number) {
		return this.map.tileData(x, y);
	}

	/**
	 * Returns the tile co-ordinates of the tile that the point's world
	 * co-ordinates reside inside.
	 * @param {IgePoint3d} point
	 * @return {IgePoint3d} The tile co-ordinates as a point object.
	 */
	pointToTile (point: IgePoint2d | IgePoint3d): IgePoint3d {
		// TODO: Could this do with some caching to check if the input values have changed and if not,
		// TODO: supply the same pre-calculated data if it already exists?
		const mx = point.x;
		const my = point.y;
		let dx, dy, tilePos;

		if (this._mountMode === IgeMountMode.flat) {
			// 2d
			dx = mx; //+ this._tileWidth / 2;
			dy = my; //+ this._tileHeight / 2;

			tilePos = new IgePoint3d(
				Math.floor(dx / this._tileWidth),
				Math.floor(dy / this._tileWidth),
				0
			);
		} else {
			// iso
			dx = mx;
			dy = my;

			tilePos = new IgePoint3d(
				Math.floor(dx / this._tileWidth),
				Math.floor(dy / this._tileHeight),
				0
			);
		}

		return tilePos;
	}

	/**
	 * Returns the world co-ordinates of the tile the mouse is currently over.
	 * @return {IgePoint3d}
	 */
	mouseTilePoint () {
		const tilePos = this.mouseToTile()
			.thisMultiply(this._tileWidth, this._tileHeight, 1);

		tilePos.x += this._tileWidth / 2;
		tilePos.y += this._tileHeight / 2;

		return tilePos;
	}

	tileToPoint (x: number, y: number) {
		let point;

		if (this._mountMode === IgeMountMode.flat) {
			point = new IgePoint3d(x, y, 0)
				.thisMultiply(this._tileWidth, this._tileHeight, 1);

			point.x -= this._bounds2d.x2 - (this._tileWidth / 2);
			point.y -= this._bounds2d.y2 - (this._tileHeight / 2);
		} else {
			point = new IgePoint3d(x * this._tileWidth + this._tileWidth / 2, y * this._tileHeight + this._tileHeight / 2, 0);
			point.x -= this._bounds2d.x2 / 2;
			point.y -= this._bounds2d.y2;
		}

		point.x2 = point.x / 2;
		point.y2 = point.y / 2;

		return point;
	}

	/**
	 * Returns the tile co-ordinates of the tile the mouse is currently over.
	 * @return {IgePoint3d}
	 */
	mouseToTile () {
		let tilePos;

		if (this._mountMode === IgeMountMode.flat) {
			tilePos = this.pointToTile(this.mousePos());
		} else {
			tilePos = this.pointToTile(this.mousePos().to2d());
		}

		return tilePos;
	}

	tileToWorld (tileX: number, tileY: number) {
		const tilePos = new IgePoint3d(tileX, tileY).thisMultiply(this._tileWidth, this._tileHeight, 0);

		tilePos.x += this._tileWidth / 2;
		tilePos.y += this._tileHeight / 2;

		if (this._mountMode === IgeMountMode.iso) {
			tilePos.thisToIso();
		}

		return tilePos;
	}

	/**
	 * Scans the map data and returns an array of rectangle
	 * objects that encapsulate the map data into discrete
	 * rectangle areas.
	 * @param {Function=} callback Returns true or false for
	 * the passed map data determining if it should be included
	 * in a rectangle or not.
	 * @return {Array}
	 */
	scanRects (callback?: IgeTileMap2dScanRectCallback) {
		const rectArray: {x: number, y: number, width: number, height: number}[] = [];
		const mapData = arrClone(this.map._mapData) as any[][];

		// Loop the map data and scan for blocks that can
		// be converted into static box2d rectangle areas
		for (const y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (const x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (mapData[y][x] && (!callback || (callback && callback(mapData[y][x], parseInt(x, 10), parseInt(y, 10))))) {
							rectArray.push(this._scanRects(mapData, parseInt(x, 10), parseInt(y, 10), callback));
						}
					}
				}
			}
		}

		return rectArray;
	}

	_scanRects (mapData: any[][], x: number, y: number, callback?: IgeTileMap2dScanRectCallback) {
		const rect = {
			x,
			y,
			"width": 1,
			"height": 1
		};

		let nx = x + 1;
		let ny = y + 1;

		// Clear the current x, y cell mapData
		mapData[y][x] = 0;

		while (mapData[y][nx] && (!callback || (callback && callback(mapData[y][nx], nx, y)))) {
			rect.width++;

			// Clear the mapData for this cell
			mapData[y][nx] = 0;

			// Next column
			nx++;
		}

		while (mapData[ny] && mapData[ny][x] && (!callback || (callback && callback(mapData[ny][x], x, ny)))) {
			// Check for mapData either side of the column width
			if ((mapData[ny][x - 1] && (!callback || (callback && callback(mapData[ny][x - 1], x - 1, ny)))) || (mapData[ny][x + rect.width] && (!callback || (callback && callback(mapData[ny][x + rect.width], x + rect.width, ny))))) {
				return rect;
			}

			// Loop the column's map data and check that there is
			// an intact column the same width as the starting column
			for (nx = x; nx < x + rect.width; nx++) {
				if (!mapData[ny][nx] || (callback && !callback(mapData[ny][nx], nx, ny))) {
					// This row has a different column width from the starting
					// column so return the rectangle as it stands
					return rect;
				}
			}

			// Mark the row as cleared
			for (nx = x; nx < x + rect.width; nx++) {
				mapData[ny][nx] = 0;
			}

			rect.height++;
			ny++;
		}

		return rect;
	}

	inGrid (x: number, y: number, width: number = 1, height: number = 1) {
		// Checks if the passed area is inside the tile map grid as defined by gridSize
		return x >= 0 && y >= 0 && x + width <= this._gridSize.x && y + height <= this._gridSize.y;
	}

	/**
	 * Gets / sets the mouse tile hover color used in conjunction with the
	 * drawMouse() method.
	 * @param {string=} val The hex or rbg string color definition e.g. #ff0099.
	 * @returns {*}
	 */
	hoverColor (val?: string) {
		if (val !== undefined) {
			this._hoverColor = val;
			return this;
		}

		return this._hoverColor;
	}

	/**
	 * Loads map data from a saved map.
	 * @param {Object} map The map data object.
	 */
	loadMap (map: IgeTileMap2dSavedMap) {
		// Just fill in the map data
		this.map.mapData(map.data, 0, 0);

		return this;
	}

	/**
	 * Returns a map JSON string that can be saved to a data file and loaded
	 * with the loadMap() method.
	 * @return {Object} The map data object.
	 */
	saveMap (): string {
		// in URL format
		let dataX: number = 0, dataY: number = 0;
		const mapData = this.map._mapData;

		// Get the lowest x, y
		for (const y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				for (const x in mapData[y]) {
					if (mapData[y].hasOwnProperty(x)) {
						if (parseInt(x) < dataX) {
							dataX = parseInt(x);
						}

						if (parseInt(y) < dataY) {
							dataY = parseInt(y);
						}
					}
				}
			}
		}

		return JSON.stringify({
			"data": this.map.sortedMapDataAsArray(),
			"dataXY": [dataX, dataY]
		});
	}

	isometricMounts(): boolean;
	isometricMounts(val: boolean): this;
	isometricMounts (val?: boolean) {
		if (val !== undefined) {
			super.isometricMounts(val);

			// Re-call the methods that check iso mounts property
			this.tileWidth(this._tileWidth);
			this.tileHeight(this._tileHeight);
			this.gridSize(this._gridSize.x, this._gridSize.y);

			this._updateAdjustmentMatrix();
			return this;
		}

		return this._mountMode === IgeMountMode.iso;
	}

	tileMapHitPolygon () {
		if (this._mountMode === IgeMountMode.flat) {
			return this.aabb();
		}

		if (this._mountMode === IgeMountMode.iso) {
			const aabb = this.aabb(),
				poly = new IgePoly2d();

			poly.addPoint(aabb.x + aabb.width / 2, aabb.y);
			poly.addPoint(aabb.x + aabb.width, aabb.y + aabb.height / 2);
			poly.addPoint(aabb.x + aabb.width / 2, (aabb.y + aabb.height) - 1);
			poly.addPoint(aabb.x - 1, (aabb.y + aabb.height / 2) - 1);

			return poly;
		}
	}

	_processTriggerHitTests () {
		// This method overrides the one in IgeEntity
		if (this._pointerEventsActive && ige.engine._currentViewport) {
			if (!this._pointerAlwaysInside) {
				const mouseTile = this.mouseToTile();
				if (mouseTile.x >= 0 && mouseTile.y >= 0 && mouseTile.x < this._gridSize.x && mouseTile.y < this._gridSize.y) {
					return true;
				} else {
					return false;
				}
			} else {
				return true;
			}
		}

		return false;
	}

	_updateAdjustmentMatrix () {
		if (this._bounds2d.x2 && this._bounds2d.y2 && this._tileWidth && this._tileHeight) {
			if (this._mountMode === IgeMountMode.flat) {
				this._adjustmentMatrix?.translateTo(this._bounds2d.x2, this._bounds2d.y2);
			}

			if (this._mountMode === IgeMountMode.iso) {
				this._adjustmentMatrix?.translateTo(0, this._bounds2d.y2);
			}
		}
	}

	_childMounted (obj: IgeObject) {
		// We can also re-use the tile size methods since
		// they alter the same properties on the calling
		// entity anyway.
		// @ts-ignore
		obj.tileWidth = obj.tileWidth || this.tileWidth;

		// @ts-ignore
		obj.tileHeight = obj.tileHeight || this.tileHeight;

		// Set default values
		obj._tileWidth = obj._tileWidth || 1;
		obj._tileHeight = obj._tileHeight || 1;

		super._childMounted(obj);
	}
}

registerClass(IgeTileMap2d);
