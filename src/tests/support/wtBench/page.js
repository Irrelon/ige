// The browser half of the WebTransport latency bench (see src/tests/IgeNetWtBench.test.ts).
import { igeNetConnect } from "/src/engine/network/transport/igeNetWebTransport.js";
import { IgeNetReplicationClient } from "/src/engine/network/replication/IgeNetReplicationClient.js";

const q = new URLSearchParams(location.search);
const useWt = q.get("transport") === "wt";
const epoch = Number(q.get("epoch"));
const defs = {
	ship: { x: { type: "number", precision: 0.1 }, y: { type: "number", precision: 0.1 }, heading: { type: "angle", bits: 9 } },
	clock: { ms: { type: "int", min: 0, max: 65535 } }
};
const inputDefs = { thrust: { type: "number", precision: 0.01, min: -1, max: 1 } };

const { connection, transport, fallbackReason } = await igeNetConnect({
	webTransport: useWt ? { url: q.get("wtUrl"), certHash: q.get("hash") } : undefined,
	webSocket: q.get("ws")
});
const client = new IgeNetReplicationClient(connection, { schemas: defs, inputSchema: inputDefs, pingInterval: 1000, interpolationDelay: 100 });
const welcome = await client.join([{}]);
let ages = [];
let truth = { tick: 0, at: 0, age: 0 };
let snapshots = 0;
client.on("snapshot", () => {
	const c = client.latest("clock");
	if (!c) return;
	snapshots++;
	const age = (((Date.now() % 65536) - c.ms) + 65536) % 65536;
	ages.push(age);
	// Where the authority's clock is now, as far as this packet says (its tick plus the time it took to get here)
	truth = { tick: client.latestTick(), at: performance.now(), age };
});
setInterval(() => client.sendInput([{ thrust: 1 }]), 1000 / 60);
const start = performance.now();
setInterval(() => {
	const trueTick = truth.tick + ((truth.age + performance.now() - truth.at) * client.tickRate) / 1000;
	const clockErr = ((client.serverTick() - trueTick) * 1000) / client.tickRate;
	const sorted = ages.slice().sort((a, b) => a - b);
	window.report({
		t: Math.round((performance.now() - start) / 1000), rtt: Math.round(client.rtt), clockErr: Math.round(clockErr),
		ageAvg: sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : -1,
		ageMax: sorted.length ? sorted[sorted.length - 1] : -1, snaps: snapshots
	});
	ages = [];
	snapshots = 0;
}, 1000);
window.stallMain = (ms) => { const end = performance.now() + ms; while (performance.now() < end) { /* busy */ } };
window.ready = { transport, fallbackReason, tickRate: welcome.tickRate };
