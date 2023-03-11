import { IgeAssetRegister } from "./IgeAssetRegister";
import { IgeImage } from "./IgeImage";
import type IgeTexture from "./IgeTexture";

export class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
	_textureImageStore: Record<string, IgeImage> = {};

	haveAllTexturesLoaded = () => {
		return this._assetsLoading === 0;
	}
}
