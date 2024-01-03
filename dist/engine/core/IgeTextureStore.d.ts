import { IgeAssetRegister } from "../../export/exports.js"
import type { IgeTexture } from "../../export/exports.js"
export declare class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
    _textureImageStore: Record<string, ImageBitmap>;
    haveAllTexturesLoaded: () => boolean;
}
