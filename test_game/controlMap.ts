import { IgeInputDevice, IgeInputKeyboardMap, IgeInputPointerMap } from "@/enums/IgeInputDeviceMap";

export enum GameControls {
	"pointerUp",
	"pointerDown",
	"panUp",
	"panDown",
	"panLeft",
	"panRight"
}

export const controlMap = {
	[GameControls.pointerUp]: [IgeInputDevice.pointer1, IgeInputPointerMap.up],
	[GameControls.pointerDown]: [IgeInputDevice.pointer1, IgeInputPointerMap.down],
	[GameControls.panUp]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowUp],
	[GameControls.panDown]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowDown],
	[GameControls.panLeft]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowLeft],
	[GameControls.panRight]: [IgeInputDevice.keyboard, IgeInputKeyboardMap.ArrowRight]
}
