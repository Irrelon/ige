import { IgeAssets } from "./IgeAssets.js";
export class IgeTextures extends IgeAssets {
    constructor() {
        super(...arguments);
        this._textureImageStore = {};
        this.haveAllTexturesLoaded = () => {
            return this._assetsLoading === 0;
        };
    }
}
