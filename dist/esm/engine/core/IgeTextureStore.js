import { IgeAssetRegister } from "./IgeAssetRegister";
export class IgeTextureStore extends IgeAssetRegister {
    _textureImageStore = {};
    haveAllTexturesLoaded = () => {
        return this._assetsLoading === 0;
    };
}
