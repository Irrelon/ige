"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeInputControlMap = void 0;
const instance_1 = require("../instance.js");
class IgeInputControlMap {
    constructor() {
        this._inputMap = [];
    }
    push(inputMap) {
        this._inputMap.push(inputMap);
    }
    state() {
        if (this._inputMap.length === 1) {
            return Boolean(instance_1.ige.input._state[this._inputMap[0][0]][this._inputMap[0][1]]);
        }
        for (let i = 0; i < this._inputMap.length; i++) {
            if (instance_1.ige.input._state[this._inputMap[i][0]][this._inputMap[i][1]]) {
                return true;
            }
        }
    }
    val() {
        if (this._inputMap.length === 1) {
            return instance_1.ige.input._state[this._inputMap[0][0]][this._inputMap[0][1]];
        }
        for (let i = 0; i < this._inputMap.length; i++) {
            if (instance_1.ige.input._state[this._inputMap[i][0]][this._inputMap[i][1]]) {
                return instance_1.ige.input._state[this._inputMap[i][0]][this._inputMap[i][1]];
            }
        }
    }
}
exports.IgeInputControlMap = IgeInputControlMap;
