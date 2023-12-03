import { IgeInputDevice, IgeInputKeyboardMap, IgeInputPointerMap } from "../../enums/IgeInputDeviceMap.js";
export var GameControls;
(function (GameControls) {
    GameControls[GameControls["pointerUp"] = 0] = "pointerUp";
    GameControls[GameControls["pointerDown"] = 1] = "pointerDown";
    GameControls[GameControls["panUp"] = 2] = "panUp";
    GameControls[GameControls["panDown"] = 3] = "panDown";
    GameControls[GameControls["panLeft"] = 4] = "panLeft";
    GameControls[GameControls["panRight"] = 5] = "panRight";
})(GameControls || (GameControls = {}));
export const controlMap = {
    [GameControls.pointerUp]: [IgeInputDevice.pointer1, IgeInputPointerMap.up],
    [GameControls.pointerDown]: [IgeInputDevice.pointer1, IgeInputPointerMap.down],
    [GameControls.panUp]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowUp],
    [GameControls.panDown]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowDown],
    [GameControls.panLeft]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowLeft],
    [GameControls.panRight]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowRight]
};
