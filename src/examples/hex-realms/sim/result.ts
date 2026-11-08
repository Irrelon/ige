import type { CommandResult } from "./types";

export function ok (): CommandResult {
	return { ok: true };
}

export function fail (error: string): CommandResult {
	return { ok: false, error };
}
