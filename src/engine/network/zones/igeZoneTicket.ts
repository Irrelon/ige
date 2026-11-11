import { createHmac, randomBytes } from "node:crypto";

/**
 * Zone tickets (Node only): what lets a player into a zone without logging
 * in again. The directory signs one when a player enters the game, and a
 * zone signs one when a player leaves it for another (a jump to the next
 * star system); the receiving zone checks it and lets the player join with
 * the state it carries. A ticket is an HMAC-SHA256 signed, base64url token
 * with an expiry and a nonce, and each is good for one join
 * (IgeZoneTicketGuard keeps the ones used).
 *
 *     const token = signTicket({ player: "ann", zone: "orhaan", data: { x: 10, z: 20 } }, secret, 30);
 *     const ticket = verifyTicket(token, secret); // or a string saying why not
 */

/** What a ticket carries: who, into which zone, and anything the game passes along (where they arrive, their velocity). */
export interface IgeZoneTicketPayload {
	player: string;
	zone: string;
	data?: unknown;
}

/** A verified ticket: its payload, when it expires (ms since 1970) and its nonce. */
export interface IgeZoneTicket extends IgeZoneTicketPayload {
	exp: number;
	nonce: string;
}

// Strings throughout (base64url text, and a constant-time comparison of
// signatures), so the types agree across @types/node versions

function signature (body: string, secret: string): string {
	return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Equal strings, compared in a time that doesn't depend on where they differ. */
function sameText (a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/** A signed ticket for `payload`, good for `ttlSeconds` (default 30). */
export function signTicket (payload: IgeZoneTicketPayload, secret: string, ttlSeconds: number = 30, now: number = Date.now()): string {
	if (!secret) throw new Error("A zone ticket needs a secret");
	const ticket: IgeZoneTicket = { player: payload.player, zone: payload.zone, data: payload.data, exp: now + ttlSeconds * 1000, nonce: randomBytes(12).toString("base64url") };
	const body = Buffer.from(JSON.stringify(ticket), "utf8").toString("base64url");
	return `${body}.${signature(body, secret)}`;
}

/**
 * Checks a ticket's signature and expiry: the ticket, or a string saying
 * why it won't do. It doesn't know whether the ticket has been used
 * (IgeZoneTicketGuard does).
 */
export function verifyTicket (token: string, secret: string, now: number = Date.now()): IgeZoneTicket | string {
	if (typeof token !== "string" || token.length > 8192) return "That isn't a ticket.";
	const dot = token.indexOf(".");
	if (dot < 1) return "That isn't a ticket.";
	const body = token.slice(0, dot), sig = token.slice(dot + 1);
	if (!sameText(signature(body, secret), sig)) return "The ticket's signature doesn't match.";
	let ticket: IgeZoneTicket;
	try {
		ticket = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
	} catch {
		return "That isn't a ticket.";
	}
	if (!ticket || typeof ticket.player !== "string" || typeof ticket.zone !== "string" || typeof ticket.exp !== "number" || typeof ticket.nonce !== "string") return "That isn't a ticket.";
	if (now > ticket.exp) return "The ticket has expired.";
	return ticket;
}

/**
 * The tickets a zone has already taken (each is good once), remembered
 * until they'd have expired anyway.
 */
export class IgeZoneTicketGuard {
	_used = new Map<string, number>();

	/** Takes a verified ticket: false if it's been used before. */
	use (ticket: IgeZoneTicket, now: number = Date.now()): boolean {
		for (const [nonce, exp] of this._used) if (exp < now) this._used.delete(nonce);
		if (this._used.has(ticket.nonce)) return false;
		this._used.set(ticket.nonce, ticket.exp);
		return true;
	}
}
