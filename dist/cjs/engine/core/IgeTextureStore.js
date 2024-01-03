"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeTextureStore = void 0;
const exports_1 = require("../../export/exports.js");
class IgeTextureStore extends exports_1.IgeAssetRegister {
    constructor() {
        super(...arguments);
        this._textureImageStore = {};
        this.haveAllTexturesLoaded = () => {
            return this._assetsLoading === 0;
        };
    }
}
exports.IgeTextureStore = IgeTextureStore;
