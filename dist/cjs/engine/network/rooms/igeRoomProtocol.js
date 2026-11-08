"use strict";
/**
 * Messages between IgeRoomServer and IgeRoomClient: game rooms with join
 * codes, numbered seats that players keep across reconnects (seat tokens),
 * and an ordered command stream. Each accepted command goes to everyone in
 * the room with a sequence number, so every client applies the same
 * commands in the same order to its own copy of the game (lockstep or
 * turn-based play); joiners get a snapshot of the state and the sequence
 * number it is at.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IGE_ROOM_NETWORK_COMMAND = void 0;
/** The IgeNetIo command the room messages travel on. */
exports.IGE_ROOM_NETWORK_COMMAND = "igeRoom";
