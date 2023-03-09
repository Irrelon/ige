import { IgeAssets } from "./IgeAssets";
import { IgeImage } from "./IgeImage";
import type IgeTexture from "./IgeTexture";

export class IgeTextureStore extends IgeAssets<IgeTexture> {
	_textureImageStore: Record<string, IgeImage> = {};

	haveAllTexturesLoaded = () => {
		return this._assetsLoading === 0;
	}
}
