export interface IgeNetworkChatFromServerMessageStructure {
	roomId: string;
	text: string;
	from: string;
	to: string;
}

export interface IgeNetworkChatFromClientMessageStructure {
	roomId: string;
	text: string;
	to: string;
}

export interface IgeNetworkChatFromServerJoinRoomResponseStructure {
	roomId: string;
	joined: boolean;
}

export interface IgeNetworkChatFromServerLeaveRoomResponseStructure {
	roomId: string;
	joined: boolean;
}

export type IgeNetworkChatFromClientJoinRoomRequestStructure = string;
export type IgeNetworkChatFromClientLeaveRoomRequestStructure = string;

export type IgeNetworkChatRoomCreatedMessageStructure = string;
export type IgeNetworkChatRoomRemovedMessageStructure = string;

export interface IgeNetworkChatFromServerRoomStructure {
	id: string;
	name: string;
	userCount: number;
}
