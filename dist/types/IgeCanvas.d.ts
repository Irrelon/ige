import type { IgeTexture } "../engine/core/index.js";
export interface IgeCanvas extends OffscreenCanvas {
    _igeTextures: IgeTexture[];
    _loaded: boolean;
    src: string;
}
