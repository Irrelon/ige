import type { IgeInputEventControl } from "./IgeInputEventControl.js"
export type IgeInputEventHandler<EventType = Event> = ((event?: EventType, evc?: IgeInputEventControl, data?: any) => void | boolean) | (() => void);
