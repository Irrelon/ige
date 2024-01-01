import { IgeTextureMap } from "./IgeTextureMap";

/**
 * Texture maps provide a way to display textures across a tile map.
 */
export class IgeTextureAtlas extends IgeTextureMap {
	classId = "IgeTextureAtlas";
	private _dataSource: any;
	
	private _dataSourceType?: string;
	private _bufferZone?: { x: any; y: any };

	constructor (tileWidth?: number, tileHeight?: number) {
		super(tileWidth, tileHeight);
	}

	/**
	 * Get / set the data source that the atlas system will use
	 * to retrieve new map data when required.
	 * @param {string, Object} ds The url of the data source API
	 * endpoint or the actual map data object.
	 * @return {*}
	 */
	dataSource (ds) {
		if (ds !== undefined) {
			this._dataSource = ds;

			// Check the type of data source and set a flag so we don't
			// have to check it every time we read data
			switch (typeof (this._dataSource)) {
			case "string":
				// The data source is a string so it must be a URL
				this._dataSourceType = "url";
				break;

			case "object":
				// The data source is an object so it must be map data
				this._dataSourceType = "data";
				break;
			}

			return this;
		}

		return this._dataSource;
	}

	/**
	 * Gets / sets the extra data to load around the main texture map size to
	 * try to mitigate loading times on new data.
	 * @param {number} x The number of pixels along the x axis to load.
	 * @param {number} y The number of pixels along the y axis to load.
	 * @return {*}
	 */
	bufferZone (x, y) {
		if (x !== undefined && y !== undefined) {
			this._bufferZone = {x, y};
			return this;
		}

		return {"x": this._bufferZone?.x, "y": this._bufferZone?.y};
	}
}
