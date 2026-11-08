/**
 * Messages between IgeRoomServer and IgeRoomClient: game rooms with join
 * codes, numbered seats that players keep across reconnects (seat tokens),
 * and an ordered command stream. Each accepted command goes to everyone in
 * the room with a sequence number, so every client applies the same
 * commands in the same order to its own copy of the game (lockstep or
 * turn-based play); joiners get a snapshot of the state and the sequence
 * number it is at.
 */

/** The IgeNetIo command the room messages travel on. */
export const IGE_ROOM_NETWORK_COMMAND = "igeRoom";

/** A seat as everyone in the room sees it (tokens stay on the server). */
export interface IgeRoomSeatInfo {
	seat: number;
	/** The player's name ("" while nobody has taken it). */
	name: string;
	/** Claimed by a player (who may be offline for now). */
	taken: boolean;
	/** The player is connected now. */
	connected: boolean;
	/** The room's host (the seat that created it, or the next taken one when it leaves). */
	host: boolean;
}

export interface IgeRoomChatLine {
	/** -1 for messages from the server. */
	seat: number;
	name: string;
	text: string;
	/** ms since 1970. */
	time: number;
}

export type IgeRoomClientMessage =
	| { t: "create"; ref: number; name: string; options?: unknown }
	| { t: "join"; ref: number; code: string; name: string; token?: string }
	| { t: "command"; command: unknown }
	| { t: "chat"; text: string }
	| { t: "resync" }
	| { t: "leave" };

export interface IgeRoomWelcome {
	t: "welcome";
	ref: number;
	code: string;
	/** Your seat. */
	seat: number;
	/** Keep it to get the same seat back after a disconnect. */
	token: string;
	/** Sequence number of the last command included in the snapshot. */
	seq: number;
	snapshot: unknown;
	seats: IgeRoomSeatInfo[];
	chat: IgeRoomChatLine[];
	/** Game-defined room information (e.g. turn timers), see IgeServerRoom.setInfo(). */
	info: unknown;
}

export type IgeRoomServerMessage =
	| IgeRoomWelcome
	| { t: "applied"; seq: number; seat: number; command: unknown }
	| { t: "snapshot"; seq: number; snapshot: unknown }
	| { t: "seats"; seats: IgeRoomSeatInfo[] }
	| { t: "info"; info: unknown }
	| { t: "chat"; line: IgeRoomChatLine }
	| { t: "error"; error: string; ref?: number }
	| { t: "left" };
