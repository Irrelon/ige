import type { IgeTexture } from "../engine/core/IgeTexture.js"
export interface IgeCanvas extends OffscreenCanvas {
    _igeTextures: IgeTexture[];
    _loaded: boolean;
    src: string;
}
