import { IgeInputDevice, IgeInputKeyboardMap, IgeInputPointerMap } from "@/enums/IgeInputDeviceMap";

export declare enum GameControls {
	"pointerUp" = 0,
	"pointerDown" = 1,
	"panUp" = 2,
	"panDown" = 3,
	"panLeft" = 4,
	"panRight" = 5
}
export declare const controlMap: {
	0: (IgeInputDevice | IgeInputPointerMap)[];
	1: (IgeInputDevice | IgeInputPointerMap)[];
	2: (IgeInputDevice | IgeInputKeyboardMap)[];
	3: (IgeInputDevice | IgeInputKeyboardMap)[];
	4: (IgeInputDevice | IgeInputKeyboardMap)[];
	5: (IgeInputDevice | IgeInputKeyboardMap)[];
};
