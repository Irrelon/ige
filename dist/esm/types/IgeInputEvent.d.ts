import type { IgeInputEventControl } from "./IgeInputEventControl.js"
export type IgeInputEvent = ((...args: any[]) => void | boolean) | ((event?: Event, evc?: IgeInputEventControl, data?: any) => void | boolean);
