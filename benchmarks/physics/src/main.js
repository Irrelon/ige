import { runOne, ENGINES } from "./run.js";
import { SCENES } from "./scenes.js";

const params = new URLSearchParams(location.search);

if (params.has("engine")) {
	// Inside an iframe: run one benchmark and report it to the page
	runOne(params.get("engine"), params.get("scene"))
		.then((result) => parent.postMessage({ type: "result", result }, "*"))
		.catch((error) => parent.postMessage({ type: "result", result: { engineId: params.get("engine"), scene: params.get("scene"), error: String(error && error.stack || error) } }, "*"));
} else {
	const engines = (params.get("engines") || Object.keys(ENGINES).join(",")).split(",");
	const scenes = (params.get("scenes") || Object.keys(SCENES).join(",")).split(",");
	const rounds = Number(params.get("rounds") || 2);
	const status = document.getElementById("status");
	window.benchmarkResults = [];
	window.benchmarkDone = false;

	const runInFrame = (engine, scene) => new Promise((resolve) => {
		const frame = document.createElement("iframe");
		const onMessage = (event) => {
			if (event.source !== frame.contentWindow || event.data?.type !== "result") return;
			window.removeEventListener("message", onMessage);
			frame.remove();
			resolve(event.data.result);
		};
		window.addEventListener("message", onMessage);
		// Pass the page's engine options (joltIterations, joltContacts) on to the run
		const options = new URLSearchParams(location.search);
		["engines", "scenes", "rounds", "auto"].forEach((key) => options.delete(key));
		options.set("engine", engine);
		options.set("scene", scene);
		frame.src = `?${options}`;
		document.body.appendChild(frame);
	});

	const render = () => {
		const rows = [];
		for (const scene of scenes) {
			rows.push(`<tr><th colspan="9">${SCENES[scene].label}</th></tr>`);
			for (const engine of engines) {
				const runs = window.benchmarkResults.filter((r) => r.engineId === engine && r.scene === scene);
				if (!runs.length) continue;
				const ok = runs.filter((r) => !r.error);
				if (!ok.length) { rows.push(`<tr><td>${engine}</td><td colspan="8">${runs[0].error.split("\n")[0]}</td></tr>`); continue; }
				const best = (f) => Math.min(...ok.map(f)).toFixed(2);
				const r = ok[0];
				rows.push(`<tr><td>${r.engine}</td><td>${best((x) => x.step.mean)}</td><td>${best((x) => x.step.p95)}</td><td>${best((x) => x.step.max)}</td>` +
					`<td>${r.rays ? best((x) => x.rays.mean) : ""}</td><td>${r.api ? best((x) => x.api.mean) : ""}</td><td>${best((x) => x.setupMs)}</td><td>${best((x) => x.loadMs)}</td>` +
					`<td>${JSON.stringify(r.check)}</td></tr>`);
			}
		}
		document.getElementById("results").innerHTML = `<table><tr><th>Engine</th><th>step mean ms</th><th>step p95</th><th>step max</th><th>2000 rays ms</th><th>API calls ms</th><th>setup ms</th><th>load ms</th><th>check</th></tr>${rows.join("")}</table>`;
	};

	const run = async () => {
		for (let round = 0; round < rounds; round++) {
			for (const scene of scenes) {
				// Rotate the engine order each round
				const order = engines.map((_, i) => engines[(i + round) % engines.length]);
				for (const engine of order) {
					status.textContent = `round ${round + 1}/${rounds}: ${engine} / ${scene}`;
					window.benchmarkResults.push(await runInFrame(engine, scene));
					render();
				}
			}
		}
		status.textContent = "done";
		window.benchmarkDone = true;
	};

	document.getElementById("start").addEventListener("click", run);
	if (params.get("auto") === "1") run();
}
