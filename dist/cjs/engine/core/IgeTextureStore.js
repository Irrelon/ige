"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeTextureStore = void 0;
const IgeAssetRegister_1 = require("./IgeAssetRegister");
class IgeTextureStore extends IgeAssetRegister_1.IgeAssetRegister {
	constructor() {
		super(...arguments);
		this._textureImageStore = {};
		this.haveAllTexturesLoaded = () => {
			return this._assetsLoading === 0;
		};
	}
}
exports.IgeTextureStore = IgeTextureStore;
