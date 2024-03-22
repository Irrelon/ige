"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeAssetRegister = void 0;
const IgeEventingClass_1 = require("./IgeEventingClass.js");
class IgeAssetRegister extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeAssetRegister";
        this._assetById = {};
        this._assetsLoading = 0;
        this._assetsTotal = 0;
    }
    exists(id) {
        return Boolean(this._assetById[id]);
    }
    get(id) {
        if (!this._assetById[id])
            throw new Error(`No asset registered with the id: ${id}`);
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
        list.forEach((tmpAsset) => tmpAsset.destroy());
    }
    whenLoaded() {
        const promiseArr = Object.values(this._assetById).map((tmpAsset) => {
            return tmpAsset.whenLoaded();
        });
        return Promise.all(promiseArr);
    }
}
exports.IgeAssetRegister = IgeAssetRegister;
