import type { IgeInputEventControl } from "./IgeInputEventControl.js"
export type IgeInputEventHandler = ((event?: Event, evc?: IgeInputEventControl, data?: any) => void | boolean) | (() => void);
