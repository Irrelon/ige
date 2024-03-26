import { IgeAssetRegister } from "./IgeAssetRegister.js"
export class IgeTextureStore extends IgeAssetRegister {
    _textureImageStore = {};
    haveAllTexturesLoaded = () => {
        return this._assetsLoading === 0;
    };
}
