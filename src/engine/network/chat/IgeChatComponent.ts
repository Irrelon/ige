import { IgeEventingClass } from "@/engine/core/IgeEventingClass";

export type IgeChatRoomOptions = Record<string, any>;

export interface IgeChatRoom {
	id: string;
	name: string;
	options?: IgeChatRoomOptions;
	users: string[];
}

export class IgeChatComponent extends IgeEventingClass {
	classId = "IgeChatComponent";
	componentId = "chat";

	_rooms: Record<string, IgeChatRoom> = {};
}
