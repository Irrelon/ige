import { IgeTexture } from "./IgeTexture";
export interface IgeCanvas extends OffscreenCanvas {
    _igeTextures: IgeTexture[];
    _loaded: boolean;
}
export declare const newCanvas: () => IgeCanvas;
