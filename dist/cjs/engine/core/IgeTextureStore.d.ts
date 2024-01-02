import { IgeAssetRegister } from "./IgeAssetRegister";
import type { IgeTexture } from "./IgeTexture";

export declare class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
	_textureImageStore: Record<string, ImageBitmap>;
	haveAllTexturesLoaded: () => boolean;
}
