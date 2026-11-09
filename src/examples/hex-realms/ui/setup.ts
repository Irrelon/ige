import type { FogMode } from "../fog";
import { hashString } from "../noise";
import { CIV_IDS, CIVS, type CivId, TECHS } from "../sim/rules";
import { defaultOptions } from "../sim/sim";
import type { Difficulty, GameOptions, VictoryType } from "../sim/types";
import type { TerrainStyle } from "../surface";
import { TURN_TIMERS } from "../net/protocol";
import type { SaveMeta, SaveStore } from "../saves";
import { esc } from "./html";
import { downloadText, ICON_UPLOAD, saveList } from "./savesScreen";

/**
 * The game setup screen: map size, civilisations, difficulty, fog of war,
 * line of sight, founding cities, victory conditions and terrain style,
 * plus loading a saved game and hosting or joining an online game.
 */

export const MAP_PRESETS: Record<string, { label: string; width: number; height: number; players: number }> = {
	tiny: { label: "Tiny 32 x 20", width: 32, height: 20, players: 2 },
	small: { label: "Small 40 x 26", width: 40, height: 26, players: 3 },
	medium: { label: "Medium 48 x 32", width: 48, height: 32, players: 4 },
	large: { label: "Large 64 x 40", width: 64, height: 40, players: 6 },
	huge: { label: "Huge 96 x 60", width: 96, height: 60, players: 8 },
	giant: { label: "Giant 128 x 80 (sandbox)", width: 128, height: 80, players: 10 },
	epic: { label: "Epic 256 x 160 (sandbox)", width: 256, height: 160, players: 12 },
	colossal: { label: "Colossal 512 x 320 (sandbox)", width: 512, height: 320, players: 12 }
};

export type SetupResult =
	| { action: "new"; options: GameOptions; style: TerrainStyle }
	| { action: "load"; id?: string }
	| { action: "host"; options: GameOptions; style: TerrainStyle; name: string; turnSeconds: number }
	| { action: "join"; code: string; name: string; style: TerrainStyle };

const VICTORY_LABELS: Record<VictoryType, string> = {
	domination: "Domination",
	score: "Score (turn limit)",
	prosperity: "Prosperity (Grand Exchange)",
	alliance: "Alliance",
	diplomatic: "Diplomatic (World Council)"
};

/** Values from the URL, used as the form's starting values (and for quick starts). */
export function optionsFromUrl (): { options: GameOptions; style: TerrainStyle; size: string } {
	const q = new URLSearchParams(window.location.search);
	const size = (q.get("size") ?? "medium").toLowerCase();
	const preset = MAP_PRESETS[size] ?? MAP_PRESETS.medium;
	const int = (key: string, fallback: number, min: number, max: number) => {
		const v = Number(q.get(key));
		return Number.isFinite(v) && v > 0 ? Math.min(max, Math.max(min, Math.floor(v))) : fallback;
	};
	const seedText = q.get("seed") ?? Math.random().toString(36).slice(2, 8);
	const fog = q.get("fog");
	const civ = q.get("civ") as CivId | null;
	const players = int("players", preset.players, 2, 12);
	const options = defaultOptions({
		width: int("w", preset.width, 16, 1024),
		height: int("h", preset.height, 12, 1024),
		players,
		seed: hashString(seedText),
		seedText,
		fog: fog === "polytopia" || fog === "off" ? fog : "civ",
		lineOfSight: q.get("los") !== "0",
		allowFounding: q.get("founding") !== "0",
		tribeTechs: q.get("tribetech") !== "0",
		difficulty: (["easy", "normal", "hard"].includes(q.get("difficulty") ?? "") ? q.get("difficulty") : "normal") as Difficulty,
		turnLimit: int("turns", 60, 10, 500)
	});
	if (civ && CIV_IDS.includes(civ)) options.civs = [civ];
	const v = q.get("v");
	if (v !== null) {
		const on = new Set(v.split(","));
		for (const key of Object.keys(options.victories) as VictoryType[]) options.victories[key] = on.has(key);
	}
	const style: TerrainStyle = q.get("style") === "natural" ? "natural" : "tiles";
	return { options, style, size };
}

export function showSetup (saves: SaveMeta[], onlineAvailable: boolean, store?: SaveStore): Promise<SetupResult> {
	const { options: start, style, size } = optionsFromUrl();
	const el = document.getElementById("setup") as HTMLDivElement;
	const sizeOptions = Object.entries(MAP_PRESETS).map(([k, p]) => `<option value="${k}" ${k === size ? "selected" : ""}>${p.label}</option>`).join("");
	const civOptions = `<option value="">Random</option>` + CIV_IDS.map((c) => `<option value="${c}" ${start.civs?.[0] === c ? "selected" : ""}>${CIVS[c].name}: starts with ${TECHS[CIVS[c].startTech].name}; ${CIVS[c].perk}</option>`).join("");
	const victories = (Object.keys(VICTORY_LABELS) as VictoryType[]).map((v) => `<label class="check"><input type="checkbox" name="v_${v}" checked> ${VICTORY_LABELS[v]}</label>`).join("");

	el.innerHTML = `<div class="setup-box">
		<h1>HEX REALMS</h1>
		<p class="dim">A hex strategy game: expand, build supply chains, fight and negotiate.</p>
		<form id="setupForm">
			<div class="grid">
				<label>Map <select name="size">${sizeOptions}</select></label>
				<label>Civilisations <input type="number" name="players" min="2" max="12" value="${start.players}"></label>
				<label>Your civilisation <select name="civ">${civOptions}</select></label>
				<label>Difficulty <select name="difficulty"><option value="easy">Easy</option><option value="normal" selected>Normal</option><option value="hard">Hard</option></select></label>
				<label>Fog of war <select name="fog">
					<option value="civ" ${start.fog === "civ" ? "selected" : ""}>Civilization: explored areas dim out of sight</option>
					<option value="polytopia" ${start.fog === "polytopia" ? "selected" : ""}>Polytopia: explored areas stay visible</option>
					<option value="off" ${start.fog === "off" ? "selected" : ""}>Off: whole map revealed</option>
				</select></label>
				<label>Terrain look <select name="style"><option value="tiles" ${style === "tiles" ? "selected" : ""}>Tiles (Polytopia-like)</option><option value="natural" ${style === "natural" ? "selected" : ""}>Natural (Civilization-like)</option></select></label>
				<label>Turn limit (score) <select name="turns">${[30, 60, 90, 120].map((t) => `<option ${t === start.turnLimit ? "selected" : ""}>${t}</option>`).join("")}</select></label>
				<label>Seed <input name="seed" value="${start.seedText}"></label>
			</div>
			<div class="checks">
				<label class="check"><input type="checkbox" name="los" ${start.lineOfSight ? "checked" : ""}> Line of sight (hills see further; mountains and forests block)</label>
				<label class="check"><input type="checkbox" name="founding" ${start.allowFounding ? "checked" : ""}> Allow founding cities (settlers)</label>
				<label class="check"><input type="checkbox" name="tribetech" ${start.tribeTechs !== false ? "checked" : ""}> Tribe starting techs (each civ begins with its own technology; off: every civ starts with none)</label>
			</div>
			<h4>Victory conditions</h4>
			<div class="checks">${victories}</div>
			<div class="setup-actions">
				<button type="submit" class="primary big">Start game</button>
				${saves.length ? `<button type="button" class="big" data-action="save-load" data-id="${saves[0].id}" title="${esc(saves[0].name)}">Continue <small>${esc(saves[0].civ)} &middot; turn ${saves[0].turn}</small></button>` : ""}
				${store?.available ? `<button type="button" id="setupLoadList">Load game${saves.length ? ` (${saves.length})` : ""}</button>` : ""}
			</div>
			<div id="setupSaves" class="hidden">
				<div class="save-head"><h4>Saved games</h4>
					<button type="button" class="ghost" data-action="save-import">${ICON_UPLOAD} Import file</button>
					<input id="setupImport" type="file" accept=".json,application/json" class="hidden">
				</div>
				<div id="setupSaveList"></div>
			</div>
			${onlineAvailable ? `<h4>Online</h4>
			<div class="setup-actions">
				<input name="name" placeholder="Your name" value="Player">
				<select name="timer" aria-label="Turn timer" title="When a person's time runs out, the AI plays their turn">${TURN_TIMERS.map((t) => `<option value="${t}">${t ? `Turn timer ${t / 60} min` : "No turn timer"}</option>`).join("")}</select>
				<button type="button" id="setupHost">Host online game</button>
				<input name="code" placeholder="Game code" size="10" maxlength="5" autocapitalize="characters" style="width:7.5em;text-transform:uppercase">
				<button type="button" id="setupJoin">Join</button>
			</div>
			<p class="dim small">Online games use the options above; other seats are played by the AI until someone joins.</p>` : ""}
		</form>
	</div>`;
	el.classList.remove("hidden");

	const form = el.querySelector("#setupForm") as HTMLFormElement;
	const read = (): { options: GameOptions; style: TerrainStyle } => {
		const f = new FormData(form);
		const preset = MAP_PRESETS[String(f.get("size"))] ?? MAP_PRESETS.medium;
		const seedText = String(f.get("seed") || "hexrealms");
		const civ = String(f.get("civ")) as CivId | "";
		const players = Math.min(12, Math.max(2, Number(f.get("players")) || preset.players));
		const wins = {} as Record<VictoryType, boolean>;
		for (const v of Object.keys(VICTORY_LABELS) as VictoryType[]) wins[v] = f.get(`v_${v}`) === "on";
		const options = defaultOptions({
			width: preset.width,
			height: preset.height,
			players,
			seed: hashString(seedText),
			seedText,
			fog: String(f.get("fog")) as FogMode,
			lineOfSight: f.get("los") === "on",
			allowFounding: f.get("founding") === "on",
			tribeTechs: f.get("tribetech") === "on",
			difficulty: String(f.get("difficulty")) as Difficulty,
			turnLimit: Number(f.get("turns")) || 60,
			victories: wins
		});
		if (civ) {
			// The chosen civ for player 0; the rest are shuffled by the game
			const rest = CIV_IDS.filter((c) => c !== civ);
			options.civs = [civ, ...rest.slice(0, players - 1)];
		}
		return { options, style: String(f.get("style")) as TerrainStyle };
	};

	return new Promise((resolve) => {
		const done = (result: SetupResult) => {
			el.classList.add("hidden");
			resolve(result);
		};
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			done({ action: "new", ...read() });
		});
		// Saved games: Continue, and the list (load, export, delete, import)
		let list = saves;
		let confirm: string | null = null;
		const drawList = () => {
			const box = el.querySelector("#setupSaveList");
			if (box) box.innerHTML = saveList(list, { canSave: false, confirmDelete: confirm });
		};
		drawList();
		el.querySelector("#setupLoadList")?.addEventListener("click", () => {
			el.querySelector("#setupSaves")?.classList.toggle("hidden");
		});
		const reread = async () => {
			list = store ? await store.list().catch(() => list) : list;
			drawList();
		};
		el.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
			if (!btn || !store) return;
			const id = btn.dataset.id ?? "";
			switch (btn.dataset.action) {
				case "save-load": done({ action: "load", id }); break;
				case "save-delete-ask": confirm = id; drawList(); break;
				case "save-delete-cancel": confirm = null; drawList(); break;
				case "save-delete": confirm = null; void store.remove(id).then(reread); break;
				case "save-export": void store.exportFile(id).then((f) => f && downloadText(f.name, f.text)); break;
				case "save-import": (el.querySelector("#setupImport") as HTMLInputElement | null)?.click(); break;
			}
		});
		el.querySelector("#setupImport")?.addEventListener("change", (e) => {
			const input = e.target as HTMLInputElement;
			const file = input.files?.[0];
			input.value = "";
			if (file && store) void file.text().then((text) => store.importFile(text)).then(reread).catch((error) => alertInList(error));
		});
		const alertInList = (error: unknown) => {
			const box = el.querySelector("#setupSaveList");
			box?.insertAdjacentHTML("afterbegin", `<p class="bad small">${esc(error instanceof Error ? error.message : "Couldn't import that file")}</p>`);
		};
		el.querySelector("#setupHost")?.addEventListener("click", () => {
			const f = new FormData(form);
			const name = String(f.get("name") || "Player");
			done({ action: "host", ...read(), name, turnSeconds: Number(f.get("timer")) || 0 });
		});
		el.querySelector("#setupJoin")?.addEventListener("click", () => {
			const f = new FormData(form);
			const code = String(f.get("code") || "").trim().toUpperCase();
			if (code) done({ action: "join", code, name: String(f.get("name") || "Player"), style: read().style });
		});
	});
}
