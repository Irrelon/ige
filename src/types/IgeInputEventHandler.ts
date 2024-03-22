import type { IgeInputEventControl } from "./IgeInputEventControl";

export type IgeInputEventHandler<EventType = Event> =
	((event?: EventType, evc?: IgeInputEventControl, data?: any) => void | boolean)
	| (() => void);
