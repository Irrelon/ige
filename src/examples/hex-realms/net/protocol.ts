import type { Command, GameOptions } from "../sim/types";

/**
 * Online play runs on the engine's game rooms (IgeRoomServer and
 * IgeRoomClient): join codes, seats players keep across reconnects (seat
 * tokens), presence, chat and an ordered command stream. The server holds
 * the authoritative simulation and runs the AI; every accepted command,
 * human or AI, goes to everyone with a sequence number and each client
 * applies the same stream to its own copy of the deterministic simulation.
 * What's specific to Hex Realms is here: the room options, the turn timer
 * command and the room information that carries the timers.
 */

/** Options for a new room: the game, and the host's turn timer. */
export interface RoomOptions {
	game: GameOptions;
	turnSeconds?: number;
}

/**
 * Set the game's default turn timer (host only), or one civ's own timer (the
 * host, or that civ's player); -1 clears a civ's own. It travels in the
 * command stream but isn't a game command: clients skip it.
 */
export interface TimerCommand {
	type: "timer";
	seconds: number;
	player?: number;
}

export type OnlineCommand = Command | TimerCommand;

/** The room information (IgeServerRoom.setInfo): turn timers and the running clock. */
export interface TimerInfo {
	/** Default seconds for a person's turn before the AI plays it (0: no limit). */
	turnSeconds: number;
	/** Civs with their own timer, by player index. */
	seatSeconds: Record<number, number>;
	/** When the current turn's time runs out (ms since 1970), or 0. */
	deadline: number;
}

/** A chat line as the HUD shows it (from -1 is the server). */
export interface ChatLine {
	from: number;
	name: string;
	text: string;
	time: number;
}

/** Seats, presence and timers, as the HUD shows them. */
export interface RoomInfo {
	/** Player names per civ ("" for AI civs). */
	names: string[];
	/** Civs whose player is connected now. */
	online: boolean[];
	/** The civ that hosts the game (sets the game's turn timer). */
	host: number;
	turnSeconds: number;
	/** Per civ: its own timer (null: uses the game's). */
	seatSeconds: (number | null)[];
	deadline: number;
}

/** Turn timer choices. */
export const TURN_TIMERS = [0, 60, 120, 300, 600];

export const SOCKET_PATH = "/hexrealms";
export const DEFAULT_PORT = 8650;
