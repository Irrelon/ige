import { IgeComponent } from "../core/IgeComponent";
import { IgeEntity } from "../core/IgeEntity";

/**
 * Loads slightly modified Tiled-format json map data into the Isogenic Engine.
 */
export declare class IgeTiledComponent extends IgeComponent {
	classId: string;
	componentId: string;
	constructor(entity: IgeEntity, options?: any);
	/**
	 * Loads a .js Tiled json-format file and converts to IGE format,
	 * then calls the callback with the newly created scene and the
	 * various layers as IgeTextureMap instances.
	 * @param url
	 * @param callback
	 */
	loadJson: (url: any, callback: any) => void;
	_processData: (data: any, callback: any) => void;
}
