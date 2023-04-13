import { IgeAssetRegister } from "./IgeAssetRegister.js";
export class IgeTextureStore extends IgeAssetRegister {
    constructor() {
        super(...arguments);
        this._textureImageStore = {};
        this.haveAllTexturesLoaded = () => {
            return this._assetsLoading === 0;
        };
    }
}
