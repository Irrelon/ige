import { GOOD_INFO, type Good, type Goods } from "../sim/rules";

/** Small HTML helpers shared by the HUD screens. */

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] as string));

export function goodChip (good: Good, n?: number): string {
	const info = GOOD_INFO[good];
	return `<span class="chip" style="--c:${info.color}" title="${info.name}">${info.name}${n !== undefined ? ` <b>${n}</b>` : ""}</span>`;
}

export function goodsList (goods: Goods | Record<string, number>, empty = "none"): string {
	const entries = Object.entries(goods).filter(([, n]) => (n ?? 0) > 0);
	if (!entries.length) return `<span class="dim">${empty}</span>`;
	return entries.map(([g, n]) => (g === "food" ? `<span class="chip" style="--c:#c98b4a">Food <b>${n}</b></span>` : goodChip(g as Good, n as number))).join(" ");
}

export function goodsInline (goods: Goods): string {
	return Object.entries(goods).filter(([, n]) => (n ?? 0) > 0).map(([g, n]) => `${n} ${GOOD_INFO[g as Good].name.toLowerCase()}`).join(", ") || "nothing";
}

export function stars (n: number): string {
	return `<span class="stars">&#9733;${Math.floor(n)}</span>`;
}

export function swatch (color: string): string {
	return `<span class="swatch" style="background:${color}"></span>`;
}

/** A button that runs a HUD action, disabled with the reason as its tooltip when there is a problem. */
export function actionButton (action: string, label: string, data: Record<string, string | number> = {}, problem: string | null = null, cls = "", title = ""): string {
	const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(" ");
	const tip = problem ?? title;
	return `<button class="${cls}" data-action="${action}" ${attrs} ${problem ? "disabled" : ""} ${tip ? `title="${esc(tip)}"` : ""}>${label}</button>`;
}

export function setHtml (id: string, html: string): void {
	const el = document.getElementById(id);
	if (el && el.innerHTML !== html) el.innerHTML = html;
}
