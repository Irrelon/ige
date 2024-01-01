"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlMap = exports.GameControls = void 0;
const IgeInputDeviceMap_1 = require("../../enums/IgeInputDeviceMap.js");
var GameControls;
(function (GameControls) {
    GameControls[GameControls["pointerUp"] = 0] = "pointerUp";
    GameControls[GameControls["pointerDown"] = 1] = "pointerDown";
    GameControls[GameControls["panUp"] = 2] = "panUp";
    GameControls[GameControls["panDown"] = 3] = "panDown";
    GameControls[GameControls["panLeft"] = 4] = "panLeft";
    GameControls[GameControls["panRight"] = 5] = "panRight";
})(GameControls = exports.GameControls || (exports.GameControls = {}));
exports.controlMap = {
    [GameControls.pointerUp]: [IgeInputDeviceMap_1.IgeInputDevice.pointer1, IgeInputDeviceMap_1.IgeInputPointerMap.up],
    [GameControls.pointerDown]: [IgeInputDeviceMap_1.IgeInputDevice.pointer1, IgeInputDeviceMap_1.IgeInputPointerMap.down],
    [GameControls.panUp]: [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowUp],
    [GameControls.panDown]: [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowDown],
    [GameControls.panLeft]: [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowLeft],
    [GameControls.panRight]: [IgeInputDeviceMap_1.IgeInputDevice.keyboard, IgeInputDeviceMap_1.IgeInputKeyboardMap.ArrowRight]
};
