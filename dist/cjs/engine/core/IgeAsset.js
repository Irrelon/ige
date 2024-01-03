"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeAsset = void 0;
const exports_1 = require("../../export/exports.js");
class IgeAsset extends exports_1.IgeEventingClass {
    constructor() {
        super(...arguments);
        this._loaded = false;
    }
    id(id) {
        if (id === undefined)
            return this._assetId;
        this._assetId = id;
    }
    /**
     * A promise that resolves to true when the asset has loaded.
     */
    whenLoaded() {
        return new Promise((resolve) => {
            if (this._loaded) {
                return resolve(true);
            }
            const listener = () => {
                resolve(true);
                this.off("loaded", listener);
            };
            this.on("loaded", listener);
        });
    }
    destroy() {
        return this;
    }
}
exports.IgeAsset = IgeAsset;
