import { IgeComponent } from "../core/IgeComponent.js"
import type { IgeEngine } from "../core/IgeEngine.js"
/**
 * Loads slightly modified Tiled-format json map data into the Isogenic Engine.
 */
export declare class IgeTiledComponent extends IgeComponent<IgeEngine> {
    classId: string;
    componentId: string;
    constructor(entity: IgeEngine, options?: any);
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
