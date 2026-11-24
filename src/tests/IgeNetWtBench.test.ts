/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import dgram from "node:dgram";
import http from "node:http";
import path from "node:path";
import ts from "typescript";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import type { IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import { IgeNetWebSocketServer } from "@/engine/network/transport/IgeNetWebSocketServer";
import { IgeNetWebTransportServer } from "@/engine/network/transport/IgeNetWebTransportServer";
import { igeNetMergeListeners } from "@/engine/network/transport/igeNetWebSocket";
import type { IgeNetWtBacklog } from "@/engine/network/transport/igeNetWebTransport";
import type { IgeNetConnection } from "@/engine/network/transport/IgeNetTransport";

/**
 * Live latency bench for WebTransport against the WebSocket, in a headless Chrome of its own
 * (not Rob's): a replication host with game-like traffic (about 30 moving ships, state packets
 * at 30 a second, inputs back at 60 a second, the ping every second) plus, on a schedule, big
 * reliable bursts on the stream, stalls of the server's event loop and a stalled browser tab.
 * Per second the page reports `client.rtt` (what the HUD shows), the client clock's error against
 * the host's true tick (ms; interpolation rides on it) and how old the freshest state was when
 * it arrived (ms, from a timestamp the host writes each tick, same machine so same clock).
 *
 * Skipped unless NET_BENCH=1. Needs puppeteer-core (not a dependency: point PUPPETEER_CORE at an
 * installed copy, e.g. one in ~/.npm/_npx/*\/node_modules/puppeteer-core) and a Chrome
 * (CHROME_PATH, default the macOS one):
 *     NET_BENCH=1 PUPPETEER_CORE=/path/to/puppeteer-core npx jest --runTestsByPath src/tests/IgeNetWtBench.test.ts
 * Env: NET_BENCH_SECONDS (default 90), NET_BENCH_PORT (default 9400, uses this and the next 3),
 * NET_BENCH_ONLY ("wt" or "ws"), NET_BENCH_TRICKLE (KB a second of steady reliable JSON), NET_BENCH_LINK (a poor UDP path for WebTransport, see udpProxy).
 */
const run = process.env.NET_BENCH ? describe : describe.skip;
const load = (name: string) => (globalThis as unknown as { igeNativeImport: (n: string) => Promise<any> }).igeNativeImport(name);

const SECONDS = Number(process.env.NET_BENCH_SECONDS ?? 90);
const PORT = Number(process.env.NET_BENCH_PORT ?? 9400);
const TICK = 30;
const SHIPS = 30;
const root = path.resolve(__dirname, "../..");

const defs: Record<string, Record<string, IgeNetFieldDef>> = {
	ship: { x: { type: "number", precision: 0.1 }, y: { type: "number", precision: 0.1 }, heading: { type: "angle", bits: 9 } },
	clock: { ms: { type: "int", min: 0, max: 65535 } }
};
const inputDefs: Record<string, IgeNetFieldDef> = { thrust: { type: "number", precision: 0.01, min: -1, max: 1 } };

/** Serves the page and transpiles the engine's TypeScript to browser modules as asked for. */
function pageServer (): http.Server {
	return http.createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://x");
		if (url.pathname === "/") {
			res.setHeader("content-type", "text/html");
			res.end("<!doctype html><script type=\"module\" src=\"/bench/page.js\"></script>");
			return;
		}
		res.setHeader("cache-control", "no-store");
		res.setHeader("content-type", "text/javascript");
		if (url.pathname === "/bench/page.js") {
			res.end(readFileSync(path.join(__dirname, "support/wtBench/page.js")));
			return;
		}
		const file = path.join(root, url.pathname.replace(/\.js$/, ".ts"));
		if (!url.pathname.startsWith("/src/") || !existsSync(file)) {
			console.log("404", url.pathname);
			res.statusCode = 404;
			res.end();
			return;
		}
		const out = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
		res.end(out.replace(/(from\s+|import\s*\(\s*)(["'])@\/([^"']+)\2/g, (_m, a, q, p) => `${a}${q}/src/${p}.js${q}`));
	});
}

/**
 * A UDP proxy in front of the WebTransport server that models a poor path: one-way delay, random
 * loss and a rate limit with a drop-tail queue, each way. NET_BENCH_LINK="delayMs,loss,kbps,queueMs"
 * (e.g. "30,0.02,2000,150"); without it the proxy isn't used.
 */
function udpProxy (listen: number, target: number, link: { delay: number; loss: number; kbps: number; queueMs: number }): { close: () => void; dropped: () => number } {
	const front = dgram.createSocket("udp4");
	const back = new Map<string, dgram.Socket>();
	const free = { up: 0, down: 0 };
	let dropped = 0;
	const pass = (dir: "up" | "down", size: number, deliver: () => void) => {
		const now = Date.now();
		const start = Math.max(now, free[dir]);
		if (start - now > link.queueMs || Math.random() < link.loss) {
			dropped++;
			return;
		}
		free[dir] = start + (size * 8) / link.kbps;
		setTimeout(deliver, free[dir] - now + link.delay);
	};
	front.on("message", (msg, rinfo) => {
		const key = `${rinfo.address}:${rinfo.port}`;
		let up = back.get(key);
		if (!up) {
			up = dgram.createSocket("udp4");
			up.on("message", (reply) => pass("down", reply.length, () => front.send(reply, rinfo.port, rinfo.address)));
			back.set(key, up);
		}
		const socket = up;
		pass("up", msg.length, () => socket.send(msg, target, "127.0.0.1"));
	});
	front.bind(listen, "127.0.0.1");
	return { close: () => { front.close(); for (const s of back.values()) s.close(); }, dropped: () => dropped };
}

const stats = (values: number[]) => {
	const s = values.slice().sort((a, b) => a - b);
	const p = (n: number) => s[Math.min(s.length - 1, Math.floor((s.length * n) / 100))] ?? 0;
	return { p50: p(50), p95: p(95), max: s[s.length - 1] ?? 0 };
};

run("WebTransport against WebSocket latency (live, headless Chrome)", () => {
	jest.setTimeout((SECONDS * 2 + 120) * 1000);
	it("prints rtt, clock error and state age over time", async () => {
		const puppeteer = createRequire(__filename)(process.env.PUPPETEER_CORE ?? "puppeteer-core");
		const wt = new IgeNetWebTransportServer({ port: PORT + 1, host: "127.0.0.1", load });
		await wt.start();
		const wsHttp = http.createServer();
		const sockets = new IgeNetWebSocketServer(wsHttp);
		await new Promise<void>((r) => wsHttp.listen(PORT + 2, "127.0.0.1", r));
		const connections: IgeNetConnection[] = [];
		const track = (listener: { onConnection: (fn: (c: IgeNetConnection) => void) => void; close: () => void }) => ({
			onConnection: (fn: (c: IgeNetConnection) => void) => listener.onConnection((c) => { connections.push(c); c.onClose(() => connections.splice(connections.indexOf(c), 1)); fn(c); }),
			close: () => listener.close()
		});
		const host = new IgeNetReplicationHost<{ thrust: number }>(igeNetMergeListeners(track(wt), track(sockets.listen("/sync"))), {
			schemas: defs as never,
			inputSchema: inputDefs as never,
			tickRate: TICK,
			sendRate: TICK,
			join: (machine) => {
				machine.viewer.subscribe("w");
				return ["p"];
			},
			step: (_dt, tick) => {
				host.replicator.get("clock")!.write({ ms: Date.now() % 65536 });
				for (let i = 0; i < SHIPS; i++) host.replicator.get(`s${i}`)!.write({ x: i * 20 + Math.sin(tick / 10 + i) * 90, y: Math.cos(tick / 13 + i) * 90 + tick * 0.01, heading: (tick / 20 + i) % (Math.PI * 2) });
			}
		});
		host.replicator.create("clock", "clock", { ms: 0 }, { scope: "w" });
		for (let i = 0; i < SHIPS; i++) host.replicator.create("ship", `s${i}`, { x: 0, y: 0, heading: 0 }, { scope: "w" });
		host.start();
		const epoch = Date.now() - (host.tick * 1000) / TICK;
		const linkSpec = process.env.NET_BENCH_LINK?.split(",").map(Number);
		const proxy = linkSpec ? udpProxy(PORT + 3, PORT + 1, { delay: linkSpec[0], loss: linkSpec[1], kbps: linkSpec[2], queueMs: linkSpec[3] ?? 150 }) : undefined;
		if (linkSpec) console.log(`WebTransport through a poor link: ${linkSpec[0]} ms each way, ${linkSpec[1] * 100}% loss, ${linkSpec[2]} kbit/s, ${linkSpec[3] ?? 150} ms queue`);
		const pages = pageServer();
		await new Promise<void>((r) => pages.listen(PORT, "127.0.0.1", r));
		const browser = await puppeteer.launch({
			executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			headless: "new", args: ["--no-first-run", "--user-data-dir=" + path.join(require("node:os").tmpdir(), `wtbench-${process.pid}`)]
		});
		const rows: string[] = [];
		try {
			for (const mode of (process.env.NET_BENCH_ONLY ? [process.env.NET_BENCH_ONLY] : ["ws", "wt"]) as ("wt" | "ws")[]) {
				const page = await browser.newPage();
				page.on("pageerror", (e: Error) => console.log("page error", e.message));
				page.on("console", (m: { text: () => string }) => console.log("page:", m.text()));
				const samples: { t: number; rtt: number; streamRtt: number; clockErr: number; ageAvg: number; ageMax: number; snaps: number }[] = [];
				await page.exposeFunction("report", (s: (typeof samples)[number]) => samples.push(s));
				const base = `http://localhost:${PORT}/?transport=${mode}&epoch=${epoch}&hash=${wt.certHash}&wtUrl=${encodeURIComponent(`https://127.0.0.1:${proxy ? PORT + 3 : PORT + 1}/sync`)}&ws=${encodeURIComponent(`ws://127.0.0.1:${PORT + 2}/sync`)}`;
				await page.goto(base);
				await page.waitForFunction("window.ready", { timeout: 15000 });
				const ready = await page.evaluate("window.ready");
				console.log(`${mode}: connected over ${ready.transport}${ready.fallbackReason ? ` (${ready.fallbackReason})` : ""}`);
				const events: string[] = [];
				const burst = (kb: number) => {
					const blob = { t: "blob", data: "x".repeat(kb * 1024) };
					for (const c of connections) c.send(blob, true);
					events.push(`burst ${kb}KB`);
				};
				const stall = (ms: number) => {
					const end = Date.now() + ms;
					while (Date.now() < end) { /* busy */ }
					events.push(`server stall ${ms}ms`);
				};
				// A steady trickle of reliable JSON (KB a second), as a chatty game's control messages would be
				const trickleKb = Number(process.env.NET_BENCH_TRICKLE ?? 0);
				const trickle = trickleKb ? setInterval(() => { for (const c of connections) c.send({ t: "chat", data: "y".repeat(trickleKb * 100) }, true); }, 100) : undefined;
				const queueLog: string[] = [];
				const queueTimer = setInterval(() => {
					const c = connections[0] as unknown as { backlog?: () => IgeNetWtBacklog } | undefined;
					const q = c?.backlog?.();
					queueLog.push(q ? `${Math.round(q.streamBytes / 1024)}KB/${q.datagramsPending}/${q.dropped}` : "-");
				}, 1000);
				const at = (frac: number) => new Promise((r) => setTimeout(r, SECONDS * 1000 * frac));
				const steps: [number, () => unknown][] = [
					[0.2, () => burst(150)], [0.3, () => stall(400)], [0.4, () => { burst(200); burst(200); }],
					[0.5, () => stall(300)], [0.6, () => page.evaluate("window.stallMain(3000)")], [0.8, () => burst(100)]
				];
				let last = 0;
				const marks: Record<number, string> = {};
				for (const [frac, fn] of steps) {
					await at(frac - last);
					last = frac;
					const before = events.length;
					await fn();
					const sampleAt = samples.length ? samples[samples.length - 1].t : 0;
					marks[sampleAt] = events.slice(before).join(", ") || "tab stalled 3s";
				}
				await at(1 - last);
				clearInterval(trickle);
				clearInterval(queueTimer);
				const queued = "n/a";
				const lines = [`\n== ${mode === "wt" ? "WebTransport" : "WebSocket"} ==  (writer desiredSize at end: ${queued || "n/a"})`, "t(s)  rtt  stream  clockErr  ageAvg  ageMax  snaps/s  server backlog (stream/datagrams/dropped)  event"];
				for (const s of samples) lines.push(`${String(s.t).padStart(4)}  ${String(s.rtt).padStart(4)}  ${String(s.streamRtt).padStart(6)}  ${String(s.clockErr).padStart(8)}  ${String(s.ageAvg).padStart(6)}  ${String(s.ageMax).padStart(6)}  ${String(s.snaps).padStart(7)}  ${(queueLog[s.t - 1] ?? "-").padStart(22)}  ${marks[s.t] ?? ""}`);
				const third = Math.floor(samples.length / 3);
				const rtt = (from: number, to: number) => stats(samples.slice(from, to).map((s) => s.rtt));
				lines.push(`rtt first third ${JSON.stringify(rtt(0, third))}, last third ${JSON.stringify(rtt(samples.length - third, samples.length))}`);
				lines.push(`state age ${JSON.stringify(stats(samples.map((s) => s.ageAvg)))}, clock error ${JSON.stringify(stats(samples.map((s) => Math.abs(s.clockErr))))}`);
				rows.push(lines.join("\n"));
				await page.close();
			}
		} finally {
			console.log(rows.join("\n"));
			await browser.close();
			host.destroy();
			pages.close();
			wsHttp.close();
			wt.close();
			proxy?.close();
		}
	});
});
