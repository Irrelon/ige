/**
 * One connection between a machine and the authority, as either end sees
 * it. Reliable messages arrive once and in order; unreliable ones (inputs,
 * snapshots) may be lost or arrive out of order, and the sync layer copes.
 * Implementations: igeNetLoopback() (same page, or tests with simulated
 * latency and loss); WebSocket and WebRTC transports follow the same shape.
 */
export interface IgeNetConnection {
	send (message: unknown, reliable?: boolean): void;
	onMessage (listener: (message: unknown) => void): void;
	onClose (listener: () => void): void;
	close (): void;
}

/** The authority's side of a transport: hands over each machine that connects. */
export interface IgeNetListener {
	onConnection (listener: (connection: IgeNetConnection) => void): void;
	close (): void;
}

export interface IgeNetLoopbackOptions {
	/** One-way delay in ms (default 0: delivered on the next microtask). */
	latency?: number;
	/** Up to this many ms added at random to each message's delay (unreliable messages may then overtake). */
	jitter?: number;
	/** Chance (0-1) that an unreliable message is lost. */
	loss?: number;
	/** Messages are copied through JSON like a real network (default true), so nothing is shared by reference. */
	copy?: boolean;
}

/**
 * An in-memory transport: the authority and its machines in the same page
 * (offline and local split-screen play run this way), or tests with
 * simulated latency, jitter and loss.
 * @example #Host and play in one page
 *     const net = igeNetLoopback();
 *     const host = new IgeNetSyncHost(net.listener, { ... });
 *     const client = new IgeNetSyncClient(net.connect());
 */
export function igeNetLoopback (options: IgeNetLoopbackOptions = {}): { listener: IgeNetListener; connect: () => IgeNetConnection } {
	const latency = options.latency ?? 0;
	const jitter = options.jitter ?? 0;
	const loss = options.loss ?? 0;
	const copy = options.copy ?? true;
	let onConnection: ((connection: IgeNetConnection) => void) | undefined;
	const waiting: IgeNetConnection[] = [];

	/** One direction of a connection. */
	const channel = () => {
		const listeners: ((message: unknown) => void)[] = [];
		let lastReliable = 0;
		let open = true;
		return {
			listeners,
			close: () => { open = false; },
			deliver: (message: unknown, reliable: boolean) => {
				if (!open || (!reliable && loss > 0 && Math.random() < loss)) return;
				const data = copy ? JSON.parse(JSON.stringify(message)) : message;
				const run = () => {
					if (open) for (const listener of listeners) listener(data);
				};
				if (latency <= 0 && jitter <= 0) {
					queueMicrotask(run);
					return;
				}
				let at = Date.now() + latency + Math.random() * jitter;
				if (reliable) {
					// Reliable messages keep their order
					at = Math.max(at, lastReliable);
					lastReliable = at;
				}
				setTimeout(run, Math.max(0, at - Date.now()));
			}
		};
	};

	const listener: IgeNetListener = {
		onConnection: (fn) => {
			onConnection = fn;
			for (const connection of waiting.splice(0)) fn(connection);
		},
		close: () => { onConnection = undefined; }
	};

	const connect = (): IgeNetConnection => {
		const toHost = channel();
		const toMachine = channel();
		const closeListeners: (() => void)[][] = [[], []];
		let closed = false;
		const close = () => {
			if (closed) return;
			closed = true;
			toHost.close();
			toMachine.close();
			queueMicrotask(() => {
				for (const list of closeListeners) for (const fn of list) fn();
			});
		};
		const end = (out: ReturnType<typeof channel>, into: ReturnType<typeof channel>, side: number): IgeNetConnection => ({
			send: (message, reliable = true) => out.deliver(message, reliable),
			onMessage: (fn) => { into.listeners.push(fn); },
			onClose: (fn) => { closeListeners[side].push(fn); },
			close
		});
		const machineEnd = end(toHost, toMachine, 0);
		const hostEnd = end(toMachine, toHost, 1);
		if (onConnection) queueMicrotask(() => onConnection?.(hostEnd));
		else waiting.push(hostEnd);
		return machineEnd;
	};

	return { listener, connect };
}
