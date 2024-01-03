import type { IgeTexture } from "../export/exports.js"
export interface IgeCanvas extends OffscreenCanvas {
    _igeTextures: IgeTexture[];
    _loaded: boolean;
    src: string;
}
