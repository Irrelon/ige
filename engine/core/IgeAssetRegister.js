import IgeEventingClass from "./IgeEventingClass.js";
export class IgeAssetRegister extends IgeEventingClass {
    constructor() {
        super(...arguments);
        this._assetById = {};
        this._assetsLoading = 0;
        this._assetsTotal = 0;
    }
    get(id) {
        return this._assetById[id];
    }
    add(id, item) {
        if (this._assetById[id]) {
            throw new Error(`Cannot add asset with id ${id} because one with this id already exists!`);
        }
        this._assetsTotal++;
        this._assetById[id] = item;
        if (item._loaded)
            return;
        this._assetsLoading++;
        item.whenLoaded().then(() => {
            this._assetsLoading--;
        });
    }
    remove(id) {
        this._assetsTotal--;
        delete this._assetById[id];
    }
    whenLoaded() {
        const promiseArr = Object.values(this._assetById).map((tmpIgeTexture) => {
            return tmpIgeTexture.whenLoaded();
        });
        return Promise.all(promiseArr);
    }
}
