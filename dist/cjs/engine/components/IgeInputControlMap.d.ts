import type { IgeInputDevice } from "../../enums/IgeInputDeviceMap.js"
export declare class IgeInputControlMap {
    _inputMap: [IgeInputDevice, number][];
    push(inputMap: [IgeInputDevice, number]): void;
    state(): boolean | undefined;
    val(): string | number | boolean | undefined;
}
