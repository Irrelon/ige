"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeAsset = void 0;
const IgeEventingClass_1 = require("./IgeEventingClass.js");
class IgeAsset extends IgeEventingClass_1.IgeEventingClass {
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
    _assetLoaded() {
        // Set a timeout here so that when this event is emitted,
        // the code creating the asset is given a chance to
        // set a listener first, otherwise this will be emitted
        // but nothing will have time to register a listener!
        setTimeout(() => {
            this._loaded = true;
            this.emit("loaded");
        }, 5);
    }
    destroy() {
        return this;
    }
}
exports.IgeAsset = IgeAsset;
