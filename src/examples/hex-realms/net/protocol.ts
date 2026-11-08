import type { Command, GameOptions } from "../sim/types";

/**
 * Online play: one server-held game per code. The server runs the
 * authoritative simulation and the AI; every accepted command (human or
 * AI) and every seat change is broadcast with a sequence number, and each
 * client applies the same stream to its own copy of the deterministic
 * simulation. Turns are sequential, so players can come and go between
 * turns (asynchronous play); the server saves every game to disk. Chat,
 * presence and the optional turn timer travel outside the game stream.
 */

export interface ChatLine {
	from: number;
	name: string;
	text: string;
	time: number;
}

/** Who sits where, who is connected, and the turn timer (not part of the game state). */
export interface RoomInfo {
	/** Player names per civ ("" for AI seats). */
	names: string[];
	/** Civs whose player is connected now. */
	online: boolean[];
	/** The civ that hosts the game (sets the turn timer). */
	host: number;
	/** The game's default seconds for a person's turn before the AI plays it (0: no limit). */
	turnSeconds: number;
	/** Per civ: its own timer, overriding the default (null: uses the default). */
	seatSeconds: (number | null)[];
	/** When the current turn's time runs out (ms since 1970), or 0. */
	deadline: number;
}

export type ClientMessage =
	| { t: "host"; options: GameOptions; name: string; turnSeconds?: number }
	| { t: "join"; code: string; name: string; token?: string }
	| { t: "command"; command: Command }
	| { t: "chat"; text: string }
	/** Set the game's default turn timer (host), or one civ's own (the host, or that civ's player); -1 clears a civ's own. */
	| { t: "timer"; seconds: number; player?: number }
	| { t: "leave" };

export type ServerMessage =
	| { t: "welcome"; code: string; player: number; token: string; snapshot: string; seq: number; names: string[]; room: RoomInfo; chat: ChatLine[] }
	| { t: "applied"; seq: number; player: number; command: Command }
	| { t: "seat"; seq: number; player: number; human: boolean; name: string }
	| { t: "room"; room: RoomInfo }
	| { t: "chat"; line: ChatLine }
	| { t: "error"; error: string };

/** Turn timer choices offered to the host. */
export const TURN_TIMERS = [0, 60, 120, 300, 600];

export const SOCKET_PATH = "/hexrealms";
export const DEFAULT_PORT = 8650;
