import IgeEventingClass from "./IgeEventingClass.js";
export class IgeAssets extends IgeEventingClass {
    constructor() {
        super(...arguments);
        this._assetById = {};
        this._assetArr = [];
        this._assetsLoading = 0;
        this._assetsTotal = 0;
    }
    getById(id) {
        return this._assetById[id];
    }
    onLoadStart(id, asset) {
        this._assetsLoading++;
        this._assetsTotal++;
        this.emit("loadStart", asset);
    }
    onLoadEnd(id, asset) {
        this._assetById[id] = asset;
        this._assetArr.push(asset);
        // Decrement the overall loading number
        this._assetsLoading--;
        this.emit("loadEnd", asset);
        // If we've finished...
        if (this._assetsLoading !== 0) {
            return;
        }
        setTimeout(() => {
            this.onAllLoaded();
        }, 100);
    }
    onAllLoaded() {
        // Fire off an event about this
        this.emit("allLoaded");
    }
}
