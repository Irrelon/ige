import { arrPull } from "../../../engine/utils.js";
export class ThreadSafeQueue {
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
            arrPull(this._queue, item);
        });
        // Process additions
        this._add.forEach((item) => {
            this._queue.push(item);
        });
        this._add = [];
        this._remove = [];
    }
}
