import { IgeEventingClass } from "@/engine/core/IgeEventingClass";

export type IgeChatRoomOptions = Record<string, any>;
export interface IgeChatRoom {
	id: string;
	name: string;
	options?: IgeChatRoomOptions;
	users: string[];
}
export declare class IgeChatComponent extends IgeEventingClass {
	classId: string;
	componentId: string;
	_rooms: Record<string, IgeChatRoom>;
}
