import { IgeAssetRegister } from "./IgeAssetRegister";

export class IgeTextureStore extends IgeAssetRegister {
	constructor () {
		super(...arguments);
		this._textureImageStore = {};
		this.haveAllTexturesLoaded = () => {
			return this._assetsLoading === 0;
		};
	}
}
