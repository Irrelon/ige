import { IgeEventingClass } from "./IgeEventingClass.js";
export class IgeAsset extends IgeEventingClass {
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
            const emitterHandle = this.on("loaded", () => {
                resolve(true);
                this.off("loaded", emitterHandle);
            });
        });
    }
    destroy() {
        return this;
    }
}
