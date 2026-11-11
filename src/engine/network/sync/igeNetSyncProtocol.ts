/**
 * Messages of IGE's real-time sync layer (IgeNetSyncHost / IgeNetSyncClient):
 * one authority runs the game's simulation at a fixed tick rate; machines
 * join with one or more local players, send those players' inputs every
 * tick and receive snapshots of the world (as deltas against one they
 * acknowledged) plus reliable events. Game-agnostic: inputs, player
 * descriptions, entity fields and events are whatever the game puts in
 * them (plain JSON values).
 */

/** Fields of one entity in a snapshot: plain JSON values (numbers, strings, booleans, arrays, objects). */
export type IgeNetEntityState = Record<string, unknown>;

/** Every entity in a snapshot, by id. */
export type IgeNetEntities = Record<string, IgeNetEntityState>;

/** One tick of a machine's input: its local players' inputs, in slot order. */
export interface IgeNetInputFrame<Input = unknown> {
	/** The machine's own input sequence number (1, 2, 3...). */
	seq: number;
	inputs: Input[];
}

export type IgeNetClientMessage =
	/** Join with these players, or (arriving from another zone, IgeNetSyncClient.transfer) with a ticket the host checks instead. */
	| { t: "join"; ref: number; players: unknown[]; ticket?: string }
	/** The latest input frames (a few repeated, as these may be lost) and the newest snapshot the machine has. */
	| { t: "input"; frames: IgeNetInputFrame[]; snap: number }
	| { t: "ping"; time: number }
	| { t: "leave" };

export interface IgeNetWelcome {
	t: "welcome";
	ref: number;
	/** This machine's id. */
	machine: string;
	/** The id the game gave each local player, in slot order. */
	players: string[];
	/** The authority's tick and tick rate when the machine joined. */
	tick: number;
	tickRate: number;
	/** Game-defined information (the seed, the level...). */
	info?: unknown;
}

export type IgeNetServerMessage =
	| IgeNetWelcome
	| {
		t: "snap";
		tick: number;
		/** The snapshot tick this one is a delta against (0: a full snapshot). */
		base: number;
		/** The machine's last input frame that has been applied. */
		ack: number;
		/** Entities that are new or changed (changed fields only, when based on another snapshot). */
		set: IgeNetEntities;
		/** Entities gone since the base snapshot. */
		del: string[];
		/** Fields gone from entities still there (absent or undefined now), by entity id, since the base snapshot. */
		unset?: Record<string, string[]>;
	}
	| { t: "event"; tick: number; data: unknown }
	| { t: "pong"; time: number; tick: number }
	| { t: "error"; error: string; ref?: number };
