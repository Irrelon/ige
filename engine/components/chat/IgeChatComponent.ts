import IgeComponent from "../../core/IgeComponent";

export type IgeChatRoomOptions = Record<string, any>;

export interface IgeChatRoom {
	id: string;
	name: string;
	options?: IgeChatRoomOptions;
	users: string[];
}

export class IgeChatComponent extends IgeComponent {
	classId = "IgeChatComponent";
	componentId = "chat";

	_rooms: Record<string, IgeChatRoom> = {};
}
