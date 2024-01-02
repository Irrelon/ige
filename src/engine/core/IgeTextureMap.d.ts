import type { IgePoint3d } from "./IgePoint3d";
import type { IgeTexture } from "./IgeTexture";
import { IgeTileMap2d } from "./IgeTileMap2d";
import type { IgeRect } from "@/engine/core/IgeRect";

/**
 * Texture maps provide a way to display textures / cells across a tile map.
 */
export declare class IgeTextureMap extends IgeTileMap2d {
	classId: string;
	_textureList: any[];
	_renderCenter: IgePoint3d;
	_autoSection?: number;
	_drawSectionBounds: boolean;
	_allTexturesLoaded: boolean;
	_sections: any[];
	_sectionCtx: any[];
	_sectionTileRegion?: any[];
	type: any;
	constructor(tileWidth?: number, tileHeight?: number);
	/**
	 * Gets / sets the auto sectioning mode. If enabled the texture map
	 * will render to off-screen canvases in sections denoted by the
	 * number passed. For instance if you pass 10, the canvas sections
	 * will be 10x10 tiles in size.
	 * @param {number=} val The size in tiles of each section.
	 * @return {*}
	 */
	autoSection(val?: number): number | this | undefined;
	/**
	 * Gets / sets the draw sections flag. If true the texture map will
	 * output debug lines between each section of the map when using the
	 * auto section system.
	 * @param {number=} val The boolean flag value.
	 * @return {*}
	 */
	drawSectionBounds(val?: boolean): boolean | this;
	/**
	 * Forces a cache redraw on the next tick.
	 */
	cacheForceFrame(): void;
	/**
	 * Takes another map and removes any data from this map where data already
	 * exists in the other.
	 * @param {IgeTileMap2d} entity The other map to read map data from.
	 * @return {*}
	 */
	negate(entity?: IgeTileMap2d): this;
	/**
	 * Adds a texture to the texture map's internal texture list so
	 * that it can be referenced via an index so that the texture map's
	 * data will be something like [[textureId, textureCell]]
	 * or a real world example: [[0, 1], [1, 1]].
	 * @param {IgeTexture} texture
	 * @return {Integer} The index of the texture you just added.
	 */
	addTexture(texture: IgeTexture): number;
	/**
	 * Checks the status of all the textures that have been added to
	 * this texture map and returns true if they are all loaded.
	 * @return {Boolean} True if all textures are loaded, false if
	 * not.
	 */
	allTexturesLoaded(): boolean;
	/**
	 * Sets the specified tile's texture index and cell that will be used
	 * when rendering the texture map.
	 * @param {number} x The tile x co-ordinate.
	 * @param {number} y The tile y co-ordinate.
	 * @param {number} textureIndex The texture index.
	 * @param {number} cell The cell index.
	 */
	paintTile(x: number, y: number, textureIndex: number, cell: number): void;
	/**
	 * Clears any previous tile texture and cell data for the specified
	 * tile co-ordinates.
	 * @param {number} x The tile x co-ordinate.
	 * @param {number} y The tile y co-ordinate.
	 */
	clearTile(x: number, y: number): void;
	/**
	 * Reads the map data from a standard map object and fills the map
	 * with the data found.
	 * @param {Object} map The map data object.
	 */
	loadMap(map: any): this;
	/**
	 * Returns a map JSON string that can be saved to a data file and loaded
	 * with the loadMap() method.
	 * @return {Object} The map data object.
	 */
	saveMap(): string;
	/**
	 * Clears the tile data from the map effectively wiping it clean. All
	 * existing map data will be removed. The textures assigned to the texture
	 * map will not be affected.
	 * @returns {*}
	 */
	clearMap(): this;
	/**
	 * Clears tile data from the map and also removes any textures from the
	 * map that were previously assigned to it. This is useful for reverting
	 * the texture map to it's virgin state as if it had just been created.
	 * @returns {*}
	 */
	reset(): this;
	/**
	 * Gets / sets the specified tile's texture index.
	 * @param {number} x The tile x co-ordinate.
	 * @param {number} y The tile y co-ordinate.
	 * @param {number=} textureIndex The new texture index.
	 */
	tileTextureIndex(x: any, y: any, textureIndex: any): any;
	/**
	 * Gets / sets the specified tile's texture cell.
	 * @param {number} x The tile x co-ordinate.
	 * @param {number} y The tile y co-ordinate.
	 * @param {number} cell The new cell index.
	 */
	tileTextureCell(x: any, y: any, cell: any): any;
	/**
	 * Converts data that is saved in the format [x][y] to the IGE standard
	 * of [y][x] and then returns the data.
	 * @param {Array} mapData The map data array.
	 * @return {Object} The new map data.
	 */
	convertHorizontalData(mapData: any): number[][];
	/**
	 * Handles rendering the texture map during engine tick events.
	 * @param {CanvasRenderingContext2D} ctx
	 */
	tick(ctx: any): void;
	/**
	 * Private method, checks if the specified section currently exists in the cache
	 * and if not, creates it.
	 * @param {number} sectionX The section's x co-ordinate.
	 * @param {number} sectionY The section's y co-ordinate.
	 * @private
	 */
	_ensureSectionExists(sectionX: any, sectionY: any, autoSection: number): void;
	/**
	 * Private method, draws cached image sections to the canvas context.
	 * @param {CanvasRenderingContext2D} ctx
	 * @private
	 */
	_drawSectionsToCtx(ctx: any, autoSection: number): void;
	/**
	 * Private method, renders a tile texture based on data from the texture map,
	 * to a cached section.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} x The tile x co-ordinate.
	 * @param {number} y The tile y co-ordinate.
	 * @param {Object} tileData The tile's texture and cell data.
	 * @param {Object} tileEntity The object that represents the tile.
	 * @param {IgeRect=} rect The rectangular area to limit drawing to.
	 * @param {number} sectionX The x co-ordinate of the section to draw to.
	 * @param {number} sectionY The y co-ordinate of the section to draw to.
	 * @return {*}
	 * @private
	 */
	_renderTile(
		ctx: any,
		x: any,
		y: any,
		tileData: any,
		tileEntity: any,
		rect?: IgeRect,
		sectionX?: any,
		sectionY?: any
	): any;
	/**
	 * Private method, creates an entity object that a texture can use to render
	 * itself. This is basically a dummy object that has the minimum amount of data
	 * in it that a texture requires to render such as geometry, texture
	 * cell and rendering position.
	 * @return {Object} The new tile entity object.
	 * @private
	 */
	_newTileEntity():
		| {
				_cell: number;
				_bounds2d: {
					x: number;
					y: number;
				};
				_renderPos: {
					x: number;
					y: number;
				};
		  }
		| undefined;
}
