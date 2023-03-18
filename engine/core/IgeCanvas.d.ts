import IgeTexture from "./IgeTexture";
export interface IgeCanvas extends HTMLCanvasElement {
    _igeTextures: IgeTexture[];
    _loaded: boolean;
}
export declare const newCanvas: () => IgeCanvas;
