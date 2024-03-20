import { IgeAssetRegister } from "@/engine/core/IgeAssetRegister";
import type { IgeTexture } from "@/engine/core/IgeTexture";

export class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
	_textureImageStore: Record<string, ImageBitmap> = {};

	haveAllTexturesLoaded = () => {
		return this._assetsLoading === 0;
	};
}
