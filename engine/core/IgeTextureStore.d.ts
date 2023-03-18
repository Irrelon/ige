import { IgeAssetRegister } from "./IgeAssetRegister";
import { IgeImage } from "./IgeImage";
import type IgeTexture from "./IgeTexture";
export declare class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
    _textureImageStore: Record<string, IgeImage>;
    haveAllTexturesLoaded: () => boolean;
}
