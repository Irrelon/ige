import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

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

function base64url (data: Buffer | string): string {
	return Buffer.from(data).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url (text: string): Buffer {
	return Buffer.from(text.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function signature (body: string, secret: string): string {
	return base64url(createHmac("sha256", secret).update(body).digest());
}

/** A signed ticket for `payload`, good for `ttlSeconds` (default 30). */
export function signTicket (payload: IgeZoneTicketPayload, secret: string, ttlSeconds: number = 30, now: number = Date.now()): string {
	if (!secret) throw new Error("A zone ticket needs a secret");
	const ticket: IgeZoneTicket = { player: payload.player, zone: payload.zone, data: payload.data, exp: now + ttlSeconds * 1000, nonce: base64url(randomBytes(12)) };
	const body = base64url(JSON.stringify(ticket));
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
	const want = Buffer.from(signature(body, secret)), got = Buffer.from(sig);
	if (want.length !== got.length || !timingSafeEqual(want, got)) return "The ticket's signature doesn't match.";
	let ticket: IgeZoneTicket;
	try {
		ticket = JSON.parse(fromBase64url(body).toString("utf8"));
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
