import { HISTORY_METRICS, type HistoryMetric, type HistoryPoint, METRIC_INFO } from "../sim/history";
import type { Sim } from "../sim/sim";
import { esc } from "./html";

/**
 * Rankings: line charts of each civ's standing over the game (one metric at
 * a time, one axis), with a standings table. Civs you haven't met stay
 * hidden until the game is over. Lines take each civ's own colour, plus a
 * dash pattern and a label at the line's end, so they can be told apart
 * without colour. Hovering a chart shows every civ's value that turn.
 */

/** Dash patterns, by the civ's place in the list (solid first). */
const DASHES = ["", "7 4", "2 4", "11 4 2 4", "4 3", "1 3", "9 3 3 3", "14 5"];

const W = 760, H = 280, PAD_L = 46, PAD_R = 118, PAD_T = 14, PAD_B = 30;

/** A round upper bound for an axis, and its gridline step. */
function niceMax (v: number): { max: number; step: number } {
	if (v <= 4) return { max: 4, step: 1 };
	const raw = v / 4;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw;
	return { max: Math.ceil(v / step) * step, step };
}

function shortName (name: string): string {
	return name.split(" (")[0];
}

/** Which civs this player may see in the charts. */
export function shownCivs (sim: Sim, me: number, all: boolean): number[] {
	return sim.state.players.filter((p) => all || p.index === me || sim.hasMet(me, p.index)).map((p) => p.index);
}

export function historyChart (sim: Sim, me: number, metric: HistoryMetric, civs: number[], name: (p: number) => string): string {
	const h: HistoryPoint[] = sim.state.history;
	if (!h.length) return `<p class="dim">Nothing recorded yet.</p>`;
	const values = (p: number) => h.map((pt) => pt[metric][p] ?? 0);
	let lo = 0, hi = 0;
	for (const p of civs) for (const v of values(p)) {
		lo = Math.min(lo, v);
		hi = Math.max(hi, v);
	}
	const axis = niceMax(Math.max(hi, 1));
	const floor = lo < 0 ? -niceMax(-lo).max : 0;
	const t0 = h[0].turn, t1 = Math.max(h[h.length - 1].turn, t0 + 1);
	const x = (turn: number) => PAD_L + ((turn - t0) / (t1 - t0)) * (W - PAD_L - PAD_R);
	const y = (v: number) => PAD_T + (1 - (v - floor) / (axis.max - floor)) * (H - PAD_T - PAD_B);

	const grid: string[] = [];
	for (let v = floor; v <= axis.max + 1e-9; v += axis.step) {
		grid.push(`<line class="${v === 0 ? "zero" : ""}" x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="yl" x="${PAD_L - 8}" y="${(y(v) + 4).toFixed(1)}">${Math.round(v)}</text>`);
	}
	const xTicks: string[] = [];
	const span = t1 - t0;
	const every = span <= 12 ? 2 : span <= 30 ? 5 : span <= 80 ? 10 : 25;
	for (let t = Math.ceil(t0 / every) * every; t <= t1; t += every) xTicks.push(`<text class="xl" x="${x(t).toFixed(1)}" y="${H - 10}">${t}</text>`);

	const lines: string[] = [];
	const ends: { p: number; y: number; v: number }[] = [];
	civs.forEach((p, i) => {
		const color = sim.player(p).color;
		const vs = values(p);
		const pts = h.map((pt, k) => `${x(pt.turn).toFixed(1)},${y(vs[k]).toFixed(1)}`).join(" ");
		const mine = p === me;
		lines.push(h.length > 1
			? `<polyline points="${pts}" stroke="${color}" stroke-dasharray="${DASHES[i % DASHES.length]}" class="${mine ? "me" : ""}"/>`
			: `<circle cx="${x(h[0].turn)}" cy="${y(vs[0])}" r="4" fill="${color}"/>`);
		const last = vs[vs.length - 1];
		ends.push({ p, y: y(last), v: last });
		lines.push(`<circle class="end" cx="${x(h[h.length - 1].turn).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3.5" fill="${color}"/>`);
	});
	// End labels, nudged apart so they never overlap
	ends.sort((a, b) => a.y - b.y);
	for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
	const overflow = ends.length ? ends[ends.length - 1].y - (H - PAD_B) : 0;
	if (overflow > 0) for (const e of ends) e.y -= overflow;
	const labels = ends.map((e) => `<text class="end-label${e.p === me ? " me" : ""}" x="${W - PAD_R + 10}" y="${(e.y + 4).toFixed(1)}">${esc(shortName(name(e.p)))} <tspan class="v">${e.v}</tspan></text>`).join("");

	const data = JSON.stringify({
		turns: h.map((pt) => pt.turn),
		civs: civs.map((p) => ({ name: shortName(name(p)), color: sim.player(p).color, values: values(p) })),
		x0: PAD_L, x1: W - PAD_R, w: W, t0, t1
	});
	return `<div class="hchart" data-chart='${esc(data).replace(/'/g, "&#39;")}'>
		<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${METRIC_INFO[metric].name} by turn">
			<g class="grid">${grid.join("")}</g>
			<g class="xt">${xTicks.join("")}</g>
			<g class="lines">${lines.join("")}</g>
			<g class="labels">${labels}</g>
			<line class="cross hidden" x1="0" x2="0" y1="${PAD_T}" y2="${H - PAD_B}"/>
		</svg>
		<div class="htip hidden"></div>
	</div>`;
}

/** The Rankings screen. */
export function historyModal (sim: Sim, me: number, metric: HistoryMetric, all: boolean, name: (p: number) => string): string {
	const civs = shownCivs(sim, me, all);
	const hidden = sim.state.players.length - civs.length;
	const tabs = HISTORY_METRICS.map((m) => `<button class="${m === metric ? "on" : ""}" data-action="history-metric" data-metric="${m}" title="${METRIC_INFO[m].description}">${METRIC_INFO[m].name}</button>`).join("");
	const legend = civs.map((p, i) => `<span class="hl"><svg width="26" height="8" aria-hidden="true"><line x1="1" x2="25" y1="4" y2="4" stroke="${sim.player(p).color}" stroke-width="2.5" stroke-dasharray="${DASHES[i % DASHES.length]}" stroke-linecap="round"/></svg>${esc(shortName(name(p)))}${p === me ? ` <small>(you)</small>` : ""}</span>`).join("");
	const last = sim.state.history[sim.state.history.length - 1];
	const rows = [...civs].sort((a, b) => (last?.score[b] ?? 0) - (last?.score[a] ?? 0)).map((p) => {
		const q = sim.player(p);
		const cells = HISTORY_METRICS.map((m) => `<td class="${m === metric ? "on" : ""}">${last ? last[m][p] : "-"}</td>`).join("");
		return `<tr class="${p === me ? "me" : ""}${q.alive ? "" : " gone"}"><td><span class="swatch" style="background:${q.color}"></span>${esc(shortName(name(p)))}${q.alive ? "" : ` <small class="dim">fallen</small>`}</td>${cells}</tr>`;
	}).join("");
	return `<h3>Rankings</h3>
		<div class="dp-tabs htabs">${tabs}</div>
		<p class="dim small hdesc">${METRIC_INFO[metric].description}, each turn.${hidden ? ` ${hidden} civ${hidden === 1 ? "" : "s"} you haven't met ${hidden === 1 ? "isn't" : "aren't"} shown.` : ""}</p>
		${historyChart(sim, me, metric, civs, name)}
		<div class="hlegend">${legend}</div>
		<table class="htable"><thead><tr><th>Civ</th>${HISTORY_METRICS.map((m) => `<th class="${m === metric ? "on" : ""}">${METRIC_INFO[m].name}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** Hover a chart: a crosshair at the nearest turn and every civ's value then. */
export function chartHover (e: PointerEvent): void {
	const box = (e.target as HTMLElement)?.closest?.(".hchart") as HTMLElement | null;
	if (!box) return;
	const svg = box.querySelector("svg") as SVGSVGElement;
	const tip = box.querySelector(".htip") as HTMLElement;
	const cross = box.querySelector(".cross") as SVGLineElement;
	const data = JSON.parse(box.dataset.chart ?? "{}") as { turns: number[]; civs: { name: string; color: string; values: number[] }[]; x0: number; x1: number; w: number; t0: number; t1: number };
	if (!data.turns?.length) return;
	const r = svg.getBoundingClientRect();
	const sx = ((e.clientX - r.left) / r.width) * data.w;
	if (sx < data.x0 - 10 || sx > data.x1 + 10 || e.type === "pointerleave") {
		tip.classList.add("hidden");
		cross.classList.add("hidden");
		return;
	}
	const turn = data.t0 + ((Math.min(data.x1, Math.max(data.x0, sx)) - data.x0) / (data.x1 - data.x0)) * (data.t1 - data.t0);
	let k = 0;
	for (let i = 1; i < data.turns.length; i++) if (Math.abs(data.turns[i] - turn) < Math.abs(data.turns[k] - turn)) k = i;
	const cx = data.x0 + ((data.turns[k] - data.t0) / (data.t1 - data.t0)) * (data.x1 - data.x0);
	cross.setAttribute("x1", cx.toFixed(1));
	cross.setAttribute("x2", cx.toFixed(1));
	cross.classList.remove("hidden");
	const rows = data.civs.map((c) => ({ ...c, v: c.values[k] })).sort((a, b) => b.v - a.v);
	tip.innerHTML = `<b>Turn ${data.turns[k]}</b>${rows.map((c) => `<div><span class="swatch" style="background:${c.color}"></span>${esc(c.name)}<em>${c.v}</em></div>`).join("")}`;
	const px = (cx / data.w) * r.width;
	tip.style.left = `${px > r.width * 0.6 ? px - 12 : px + 12}px`;
	tip.style.transform = px > r.width * 0.6 ? "translateX(-100%)" : "none";
	tip.classList.remove("hidden");
}
