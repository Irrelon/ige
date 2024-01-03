import type { IgeInputEventControl } from "./IgeInputEventControl.js"
export type IgeInputEvent = (event?: Event, evc?: IgeInputEventControl, data?: any) => void | boolean;
