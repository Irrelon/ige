"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeStats = void 0;
class IgeStats {
    constructor() {
        this._data = {};
        this._start = {};
    }
    start(key) {
        return this._start[key] = new Date().getTime();
    }
    end(key, add = false) {
        const delta = new Date().getTime() - this._start[key];
        if (add) {
            return this._data[key] = this._data[key] += delta;
        }
        return this._data[key] = this._data[key] = delta;
    }
}
exports.IgeStats = IgeStats;
