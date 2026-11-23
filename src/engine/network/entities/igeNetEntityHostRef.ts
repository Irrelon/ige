import type { IgeNetEntityHost } from "@/engine/network/entities/IgeNetEntityHost";

let latest: IgeNetEntityHost | undefined;

/** The most recently made entity host: what `entity.replicate()` uses. */
export function igeNetLatestEntityHost (): IgeNetEntityHost | undefined {
	return latest;
}

export function igeNetSetLatestEntityHost (host: IgeNetEntityHost | undefined): void {
	latest = host;
}
