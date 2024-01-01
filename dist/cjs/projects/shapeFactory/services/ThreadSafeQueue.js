"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadSafeQueue = void 0;
const utils_1 = require("../../../engine/utils.js");
class ThreadSafeQueue {
    constructor() {
        this._queue = [];
        this._add = [];
        this._remove = [];
    }
    addItem(item) {
        this._add.push(item);
    }
    removeItem(item) {
        this._remove.push(item);
    }
    getIndex(index) {
        return this._queue[index];
    }
    length() {
        return this._queue.length;
    }
    update() {
        // Process removals
        this._remove.forEach((item) => {
            (0, utils_1.arrPull)(this._queue, item);
        });
        // Process additions
        this._add.forEach((item) => {
            this._queue.push(item);
        });
        this._add = [];
        this._remove = [];
    }
}
exports.ThreadSafeQueue = ThreadSafeQueue;
