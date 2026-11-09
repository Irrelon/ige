import type { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import type { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import type { IgeNetConnection, IgeNetListener } from "@/engine/network/sync/IgeNetTransport";

/** The IgeNetIo command the sync messages travel on. */
export const IGE_NET_SYNC_COMMAND = "igeSync";

/**
 * The authority's side of IgeNetSyncHost over IGE's own networking
 * (IgeNetIo WebSockets): each client socket that sends a sync message
 * becomes a machine's connection. Messages all arrive reliably (TCP), so
 * unreliable sends cost the same as reliable ones. Define it before
 * clients connect.
 * @example #A dedicated server
 *     ige.init();
 *     const network = ige.network as IgeNetIoServerController;
 *     await network.start(8660);
 *     const host = new IgeNetSyncHost(igeNetSyncServerTransport(network), { ... });
 *     network.acceptConnections(true);
 *     host.start();
 */
export function igeNetSyncServerTransport (network: IgeNetIoServerController, command: string = IGE_NET_SYNC_COMMAND): IgeNetListener {
	let onConnection: ((connection: IgeNetConnection) => void) | undefined;
	const connections = new Map<string, { message: ((m: unknown) => void)[]; close: (() => void)[]; closed: boolean }>();

	const open = (clientId: string) => {
		let state = connections.get(clientId);
		if (state) return state;
		const created = { message: [] as ((m: unknown) => void)[], close: [] as (() => void)[], closed: false };
		state = created;
		connections.set(clientId, created);
		onConnection?.({
			send: (message) => {
				if (!created.closed) network.send(command, message as any, clientId);
			},
			onMessage: (fn) => { created.message.push(fn); },
			onClose: (fn) => { created.close.push(fn); },
			close: () => {
				if (created.closed) return;
				network.socket(clientId)?.close("Left the game");
				end(clientId);
			}
		});
		return created;
	};

	const end = (clientId: string) => {
		const state = connections.get(clientId);
		if (!state || state.closed) return;
		state.closed = true;
		connections.delete(clientId);
		for (const fn of state.close) fn();
	};

	network.define(command, ((data: unknown, clientId: string) => {
		const state = open(clientId);
		for (const fn of state.message) fn(data);
	}) as any);
	network.on("disconnect", (clientId: string) => end(clientId));

	return {
		onConnection: (fn) => { onConnection = fn; },
		close: () => { onConnection = undefined; }
	};
}

/**
 * A machine's connection to an IgeNetSyncHost over IGE's own networking
 * (IgeNetIo WebSockets), once the client controller has started.
 * @example #Join a dedicated server
 *     await (ige.network as IgeNetIoClientController).start("ws://localhost:8660");
 *     const client = new IgeNetSyncClient(igeNetSyncClientTransport(ige.network));
 */
export function igeNetSyncClientTransport (network: IgeNetIoClientController, command: string = IGE_NET_SYNC_COMMAND): IgeNetConnection {
	const messageListeners: ((m: unknown) => void)[] = [];
	const closeListeners: (() => void)[] = [];
	let closed = false;
	const end = () => {
		if (closed) return;
		closed = true;
		for (const fn of closeListeners) fn();
	};
	network.define(command, (data: unknown) => {
		for (const fn of messageListeners) fn(data);
	});
	network.on("disconnected", end);
	return {
		send: (message) => {
			if (!closed) network.send(command, message as any);
		},
		onMessage: (fn) => { messageListeners.push(fn); },
		onClose: (fn) => { closeListeners.push(fn); },
		close: () => {
			network.stop();
			end();
		}
	};
}
