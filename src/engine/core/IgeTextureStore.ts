import { IgeAssetRegister } from "./IgeAssetRegister";
import type { IgeTexture } from "./IgeTexture";

export class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
	_textureImageStore: Record<string, ImageBitmap> = {};

	haveAllTexturesLoaded = () => {
		return this._assetsLoading === 0;
	};
}
