import { IgeEventingClass } from "./IgeEventingClass";
export class IgeAssetRegister extends IgeEventingClass {
    constructor() {
        super(...arguments);
        this._assetById = {};
        this._assetsLoading = 0;
        this._assetsTotal = 0;
    }
    exists(id) {
        return Boolean(this._assetById[id]);
    }
    get(id) {
        if (!this._assetById[id])
            throw new Error(`No texture registered with the id: ${id}`);
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
    addGroup(group) {
        Object.keys(group).forEach((key) => {
            this.add(key, group[key]);
        });
    }
    removeGroup(group) {
        Object.keys(group).forEach((key) => {
            this.remove(key);
        });
    }
    removeList(list) {
        list.forEach((texture) => texture.destroy());
    }
    whenLoaded() {
        const promiseArr = Object.values(this._assetById).map((tmpIgeTexture) => {
            return tmpIgeTexture.whenLoaded();
        });
        return Promise.all(promiseArr);
    }
}
