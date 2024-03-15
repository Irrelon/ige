import type { IgeInputEventControl } from "./IgeInputEventControl";

export type IgeInputEventHandler =
	((event?: Event, evc?: IgeInputEventControl, data?: any) => void | boolean) | (() => void);
