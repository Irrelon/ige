"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeOptions = void 0;
class IgeOptions {
	constructor() {
		this._options = {};
	}
	get(id, valDefault) {
		return this._options[id] !== undefined ? this._options[id] : valDefault;
	}
	set(id, val) {
		this._options[id] = val;
		return this;
	}
}
exports.IgeOptions = IgeOptions;
