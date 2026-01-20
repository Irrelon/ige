import { IgeAssetRegister } from "./IgeAssetRegister.js"
import type { IgeTexture } from "./IgeTexture.js"
export declare class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
    _textureImageStore: Record<string, ImageBitmap>;
    haveAllTexturesLoaded: () => boolean;
}
