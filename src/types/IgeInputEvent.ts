import type { IgeInputEventControl } from "./IgeInputEventControl";

export type IgeInputEvent =
	((...args: any[]) => void | boolean)
	| ((event?: Event, evc?: IgeInputEventControl, data?: any) => void | boolean);
