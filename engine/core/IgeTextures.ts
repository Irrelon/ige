import { IgeAssets } from "./IgeAssets";
import type IgeTexture from "./IgeTexture";
import IgeImage from "./IgeImage";

export class IgeTextures extends IgeAssets<IgeTexture> {
	_textureImageStore: Record<string, IgeImage> = {};

	haveAllTexturesLoaded = () => {
		return this._assetsLoading === 0;
	}
}