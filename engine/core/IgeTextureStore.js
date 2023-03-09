import { IgeAssets } from "./IgeAssets.js";
export class IgeTextureStore extends IgeAssets {
    constructor() {
        super(...arguments);
        this._textureImageStore = {};
        this.haveAllTexturesLoaded = () => {
            return this._assetsLoading === 0;
        };
    }
}
