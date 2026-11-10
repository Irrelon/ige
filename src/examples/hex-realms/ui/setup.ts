import type { FogMode } from "../fog";
import { hashString } from "../noise";
import { CIV_IDS, CIVS, type CivId, TECHS } from "../sim/rules";
import { defaultOptions } from "../sim/sim";
import type { Difficulty, GameOptions, VictoryType } from "../sim/types";
import type { TerrainStyle } from "../surface";
import { TURN_TIMERS } from "../net/protocol";
import { type SaveMeta, type SaveStore, savedWhen } from "../saves";
import { getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume, unlockAudio } from "./audio";
import { esc } from "./html";
import { emblem, icon, TRIBE_COLORS } from "./icons";
import { downloadText, ICON_UPLOAD, saveList } from "./savesScreen";
import { resetTips, setTipsEnabled, tipsEnabled } from "./tips";

/**
 * The title screen: a splash ("click to begin", which also unlocks audio for
 * the title music), then the main menu (Continue, New Game, Load Game,
 * Multiplayer, Options) with a pane for each. New Game holds every game
 * option: tribe, map, civilisations, terrain look, difficulty, turn limit,
 * fog of war, rules and victory conditions.
 */

export const MAP_PRESETS: Record<string, { label: string; width: number; height: number; players: number }> = {
	tiny: { label: "Tiny", width: 32, height: 20, players: 2 },
	small: { label: "Small", width: 40, height: 26, players: 3 },
	medium: { label: "Medium", width: 48, height: 32, players: 4 },
	large: { label: "Large", width: 64, height: 40, players: 6 },
	huge: { label: "Huge", width: 96, height: 60, players: 8 },
	giant: { label: "Giant (sandbox)", width: 128, height: 80, players: 10 },
	epic: { label: "Epic (sandbox)", width: 256, height: 160, players: 12 },
	colossal: { label: "Colossal (sandbox)", width: 512, height: 320, players: 12 }
};
const STANDARD_SIZES = ["tiny", "small", "medium", "large", "huge"];
const SANDBOX_SIZES = ["giant", "epic", "colossal"];

export type SetupResult =
	| { action: "new"; options: GameOptions; style: TerrainStyle }
	| { action: "load"; id?: string }
	| { action: "host"; options: GameOptions; style: TerrainStyle; name: string; turnSeconds: number }
	| { action: "join"; code: string; name: string; style: TerrainStyle }
	| { action: "cancel" };

export interface SetupOptions {
	/** Skip the "click to begin" splash (when opened from inside a game). */
	skipSplash?: boolean;
	/** The pane to open first. */
	pane?: Pane;
	/** Opened from a game in progress: offer "Return to game". */
	inGame?: boolean;
	/** Called when the splash is dismissed (start the title music). */
	onBegin?: () => void;
	/** Whether a live 3D scene is showing behind the menu. */
	live?: boolean;
}

type Pane = "new" | "load" | "online" | "options" | null;

const VICTORY_LABELS: Record<VictoryType, string> = {
	domination: "Domination",
	score: "Score",
	prosperity: "Prosperity",
	alliance: "Alliance",
	diplomatic: "Diplomatic"
};
const VICTORY_TIPS: Record<VictoryType, string> = {
	domination: "Capture every other civ's capital",
	score: "Highest score when the turn limit is reached",
	prosperity: "Complete the Grand Exchange",
	alliance: "Win together with your allies",
	diplomatic: "Be elected World Council leader twice in a row"
};
const FOG_NOTES: Record<FogMode, string> = {
	civ: "Explored land dims when none of your units can see it, as in Civilization.",
	polytopia: "Explored land stays visible once seen, as in Polytopia.",
	off: "The whole map is revealed from the start."
};
const DIFFICULTY_NOTES: Record<Difficulty, string> = {
	easy: "Rival civs grow slowly and rarely attack.",
	normal: "Rival civs play a balanced game.",
	hard: "Rival civs expand fast, research hard and fight for land."
};
const NAME_KEY = "hexRealms.playerName";

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
		raiders: q.get("raiders") !== "0",
		buildGrowth: q.get("growth") !== "food",
		difficulty: (["easy", "normal", "hard"].includes(q.get("difficulty") ?? "") ? q.get("difficulty") : "normal") as Difficulty,
		turnLimit: q.get("turns") === "0" || q.get("turns") === "off" ? 0 : int("turns", 60, 10, 500)
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

function radio (name: string, value: string, checked: boolean, label: string, sub = ""): string {
	return `<label><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}><span>${label}${sub ? `<small>${sub}</small>` : ""}</span></label>`;
}

function toggle (name: string, checked: boolean, label: string, note: string): string {
	return `<label class="switch"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><i></i><div><span>${label}</span><small>${note}</small></div></label>`;
}

function tribeCard (id: CivId, checked: boolean): string {
	const color = TRIBE_COLORS[id];
	const civ = CIVS[id];
	return `<label class="tribe" style="--t:${color}" title="${esc(civ.name)}: starts with ${esc(TECHS[civ.startTech].name)}. ${esc(civ.perk)}">
		<input type="radio" name="civ" value="${id}" ${checked ? "checked" : ""}>
		<div class="card"><div class="emb">${emblem(id, 24)}</div><div class="tname">${civ.name}</div><div class="ttech">${TECHS[civ.startTech].name}</div><div class="tperk">${esc(civ.perk)}</div></div></label>`;
}

function newGamePane (start: GameOptions, style: TerrainStyle, size: string): string {
	const sizeKey = STANDARD_SIZES.includes(size) ? size : "medium";
	const sandbox = SANDBOX_SIZES.includes(size) ? size : "";
	const chosenCiv = start.civs?.[0] ?? "";
	const tribes = CIV_IDS.map((c) => tribeCard(c, chosenCiv === c)).join("");
	const sizes = STANDARD_SIZES.map((k) => radio("size", k, k === sizeKey, MAP_PRESETS[k].label, `${MAP_PRESETS[k].width}&times;${MAP_PRESETS[k].height}`)).join("");
	const victories = (Object.keys(VICTORY_LABELS) as VictoryType[]).map((v) => `<label class="tchip" title="${VICTORY_TIPS[v]}"><input type="checkbox" name="v_${v}" ${start.victories[v] ? "checked" : ""}><span>${VICTORY_LABELS[v]}</span></label>`).join("");
	return `<section class="title-pane" data-pane="new">
		<div class="pane-head"><div><h2>New Game</h2><p>Choose your people and the world they will rise in.</p></div></div>
		<div class="pane-body">
			<div class="field-group">
				<div class="field-label">Your tribe <small>Each starts with its own technology and a lasting perk</small>
					<label class="tribe-random" title="Let fate choose your people"><input type="radio" name="civ" value="" ${chosenCiv ? "" : "checked"}><span>${emblem("random", 15)} Random</span></label>
				</div>
				<div class="tribes">${tribes}</div>
			</div>
			<div class="field-group field-row">
				<div>
					<div class="field-label">Map size</div>
					<div class="seg" id="sizeSeg">${sizes}</div>
				</div>
				<div>
					<div class="field-label">Civilisations</div>
					<div class="stepper"><button type="button" data-step="-1" aria-label="Fewer civilisations">&minus;</button><input type="number" name="players" min="2" max="12" value="${start.players}" aria-label="Civilisations"><button type="button" data-step="1" aria-label="More civilisations">+</button></div>
				</div>
			</div>
			<div class="field-group field-row">
				<div>
					<div class="field-label">Terrain look</div>
					<div class="style-cards">
						<label class="style-card"><input type="radio" name="style" value="tiles" ${style === "tiles" ? "checked" : ""}><div class="sc"><i class="tiles-swatch"></i><div><b>Tiles</b><small>Crisp hexes, Polytopia-like</small></div></div></label>
						<label class="style-card"><input type="radio" name="style" value="natural" ${style === "natural" ? "checked" : ""}><div class="sc"><i class="natural-swatch"></i><div><b>Natural</b><small>Blended land, Civilization-like</small></div></div></label>
					</div>
				</div>
				<div>
					<div class="field-label">Difficulty</div>
					<div class="seg">${(["easy", "normal", "hard"] as Difficulty[]).map((d) => radio("difficulty", d, start.difficulty === d, d[0].toUpperCase() + d.slice(1))).join("")}</div>
					<div class="field-note" id="difficultyNote">${DIFFICULTY_NOTES[start.difficulty]}</div>
				</div>
			</div>
			<div class="field-group field-row">
				<div>
					<div class="field-label">Fog of war</div>
					<div class="seg">${radio("fog", "civ", start.fog === "civ", "Civilization")}${radio("fog", "polytopia", start.fog === "polytopia", "Polytopia")}${radio("fog", "off", start.fog === "off", "Off")}</div>
					<div class="field-note" id="fogNote">${FOG_NOTES[start.fog]}</div>
				</div>
				<div>
					<div class="field-label">Turn limit</div>
					<div class="seg">${[30, 60, 90, 120, 200, 0].map((t) => radio("turns", String(t), t === start.turnLimit, t ? String(t) : "Off")).join("")}</div>
					<div class="field-note">The highest score wins when it runs out (Score victory). Off: play on until someone wins another way.</div>
				</div>
			</div>
			<div class="field-group field-row">
				<div>${toggle("los", start.lineOfSight, "Line of sight", "Hills see further; mountains and forests block the view")}</div>
				<div>${toggle("founding", start.allowFounding, "Found new cities", "Settlers can build cities as well as capture villages")}</div>
				<div>${toggle("tribetech", start.tribeTechs !== false, "Tribe starting techs", "Off: every tribe starts with no research")}</div>
				<div>${toggle("raiders", start.raiders !== false, "Raider camps", "Outlaw camps appear on unclaimed land and raid nearby units and buildings")}</div>
				<div>${toggle("growth", start.buildGrowth !== false, "Cities grow from buildings", "As in Polytopia: each building adds population; off, cities grow from delivered food alone")}</div>
			</div>
			<div class="field-group">
				<div class="field-label">Victory conditions</div>
				<div class="chips">${victories}</div>
			</div>
			<details class="advanced">
				<summary>Advanced</summary>
				<div class="field-row" style="margin-top:10px">
					<div>
						<div class="field-label">World seed <small>The same seed makes the same map</small></div>
						<div class="seed-row"><input name="seed" value="${esc(start.seedText)}" aria-label="World seed" autocomplete="off" spellcheck="false"><button type="button" class="icon-btn" id="seedDice" title="Roll a new seed" aria-label="Roll a new seed">${icon("dice", 17)}</button></div>
					</div>
					<div>
						<div class="field-label">Sandbox maps <small>Huge worlds for exploring</small></div>
						<select name="bigsize" aria-label="Sandbox map size"><option value="">Off (use the map size above)</option>${SANDBOX_SIZES.map((k) => `<option value="${k}" ${k === sandbox ? "selected" : ""}>${MAP_PRESETS[k].label} ${MAP_PRESETS[k].width} &times; ${MAP_PRESETS[k].height}</option>`).join("")}</select>
					</div>
				</div>
			</details>
		</div>
		<div class="pane-foot"><div class="summary" id="newSummary"></div><button type="submit" class="primary big">${icon("play", 16)} Begin</button></div>
	</section>`;
}

function loadPane (canImport: boolean): string {
	return `<section class="title-pane" data-pane="load">
		<div class="pane-head"><div><h2>Load Game</h2><p>Your saved games in this browser, newest first.</p></div>
			${canImport ? `<button type="button" class="ghost" data-action="save-import">${ICON_UPLOAD} Import file</button><input id="setupImport" type="file" accept=".json,application/json" class="hidden">` : ""}
		</div>
		<div class="pane-body"><div id="setupSaveList"></div></div>
	</section>`;
}

function onlinePane (available: boolean): string {
	if (!available) {
		return `<section class="title-pane" data-pane="online">
			<div class="pane-head"><div><h2>Multiplayer</h2><p>Play with friends, each on their own device.</p></div></div>
			<div class="pane-body"><p class="dim">Online play needs the Hex Realms server, and it isn't reachable from this page. Start it with <kbd>node dist/hex-realms-server/server.cjs</kbd> and open the game from the address it prints.</p></div>
		</section>`;
	}
	let name = "Player";
	try {
		name = localStorage.getItem(NAME_KEY) || name;
	} catch {
		// ignore
	}
	return `<section class="title-pane" data-pane="online">
		<div class="pane-head"><div><h2>Multiplayer</h2><p>Take turns with friends online. Empty seats are played by the AI until someone joins.</p></div></div>
		<div class="pane-body">
			<div class="field-group" style="max-width:340px">
				<div class="field-label">Your name</div>
				<input name="name" value="${esc(name)}" maxlength="24" autocomplete="nickname" aria-label="Your name" style="width:100%">
			</div>
			<div class="online-grid">
				<div class="online-card">
					<h3>Host a game</h3>
					<p>Uses the settings from <a href="#" data-pane-link="new">New Game</a>. You'll get a code and an invite link to share.</p>
					<select name="timer" aria-label="Turn timer" title="When a player's time runs out, the AI plays their turn">${TURN_TIMERS.map((t) => `<option value="${t}">${t ? `Turn timer: ${t / 60} min` : "No turn timer"}</option>`).join("")}</select>
					<div class="row"><button type="button" class="primary" id="setupHost">${icon("globe", 16)} Host game</button></div>
				</div>
				<div class="online-card">
					<h3>Join a game</h3>
					<p>Enter the five-letter code the host shared with you.</p>
					<input name="code" class="code-input" placeholder="CODE" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Game code">
					<div class="row"><button type="button" id="setupJoin">${icon("play", 14)} Join</button></div>
				</div>
			</div>
		</div>
	</section>`;
}

function optionsPane (): string {
	const pct = (v: number) => `${Math.round(v * 100)}%`;
	let reduced = false;
	try {
		reduced = localStorage.getItem("hexRealms.motion") === "reduced";
	} catch {
		// ignore
	}
	return `<section class="title-pane" data-pane="options">
		<div class="pane-head"><div><h2>Options</h2><p>Sound and comfort. These apply to every game.</p></div></div>
		<div class="pane-body">
			<div class="field-group">
				<div class="field-label">Audio</div>
				<label class="vol"><span>${icon("music", 16)} Music</span><input type="range" min="0" max="100" value="${Math.round(getMusicVolume() * 100)}" data-vol="music"><output>${pct(getMusicVolume())}</output></label>
				<label class="vol"><span>${icon("sound", 16)} Sound effects</span><input type="range" min="0" max="100" value="${Math.round(getSfxVolume() * 100)}" data-vol="sfx"><output>${pct(getSfxVolume())}</output></label>
			</div>
			<div class="field-group">
				<div class="field-label">Interface</div>
				<label class="switch"><input type="checkbox" data-opt="tips" ${tipsEnabled() ? "checked" : ""}><i></i><div><span>Advisor tips</span><small>Short hints as new things become possible. Turning this on shows them all again.</small></div></label>
				<label class="switch"><input type="checkbox" data-opt="motion" ${reduced ? "checked" : ""}><i></i><div><span>Reduced motion</span><small>Skip unit animations and screen effects.</small></div></label>
			</div>
		</div>
	</section>`;
}

/** The newest save's line under Continue. */
function continueLine (m: SaveMeta | undefined): string {
	return m ? `${esc(m.civ.split(" (")[0])} &middot; turn ${m.turn} &middot; ${savedWhen(m.savedAt)}` : "";
}

export function showSetup (saves: SaveMeta[], onlineAvailable: boolean, store?: SaveStore, opts: SetupOptions = {}): Promise<SetupResult> {
	const { options: start, style, size } = optionsFromUrl();
	const el = document.getElementById("setup") as HTMLDivElement;
	const canLoad = !!store?.available;
	const menu = [
		opts.inGame ? `<button type="button" data-menu="back">${icon("play", 22)}<span>Return to game<small>Back to your turn</small></span></button>` : "",
		saves.length ? `<button type="button" data-menu="continue">${icon("continue", 22)}<span>Continue<small>${continueLine(saves[0])}</small></span></button>` : "",
		`<button type="button" data-menu="new">${icon("map", 22)}<span>New Game<small>Found a realm in a new world</small></span></button>`,
		canLoad ? `<button type="button" data-menu="load">${icon("folder", 22)}<span>Load Game<small id="loadCount">${saves.length ? `${saves.length} saved game${saves.length === 1 ? "" : "s"}` : "No saves yet"}</small></span></button>` : "",
		`<button type="button" data-menu="online">${icon("globe", 22)}<span>Multiplayer<small>Play with friends online</small></span></button>`,
		`<button type="button" data-menu="options">${icon("settings", 22)}<span>Options<small>Music, sound and comfort</small></span></button>`
	].join("");

	el.innerHTML = `
		<div class="title-bg${opts.live ? " live" : ""}"></div><div class="title-hexes"></div><div class="title-vignette"></div>
		${opts.skipSplash ? "" : `<div class="splash" id="splash" role="button" tabindex="0" aria-label="Begin">
			<div class="logo">HEX REALMS</div>
			<div class="logo-rule">${icon("star", 12)}</div>
			<div class="logo-sub">Build &middot; Trade &middot; Conquer</div>
			<div class="press">Click anywhere to begin</div>
		</div>`}
		<div class="title-ui${opts.skipSplash ? " on" : ""}" id="titleUi">
			<div class="title-side">
				<div class="logo">HEX REALMS</div>
				<div class="logo-sub">Build &middot; Trade &middot; Conquer</div>
				<nav class="mainmenu" aria-label="Main menu">${menu}</nav>
				<div class="title-foot"><span>Isogenic Game Engine</span><span id="musicStatus" class="music-status"></span></div>
			</div>
			<form class="title-main" id="setupForm" autocomplete="off">
				${newGamePane(start, style, size)}
				${canLoad ? loadPane(true) : ""}
				${onlinePane(onlineAvailable)}
				${optionsPane()}
			</form>
		</div>`;
	el.classList.remove("hidden");

	const form = el.querySelector("#setupForm") as HTMLFormElement;
	const panes = [...el.querySelectorAll<HTMLElement>(".title-pane")];
	const menuButtons = [...el.querySelectorAll<HTMLButtonElement>(".mainmenu button")];
	const showPane = (pane: Pane) => {
		for (const p of panes) p.classList.toggle("hidden", p.dataset.pane !== pane);
		for (const b of menuButtons) b.classList.toggle("on", b.dataset.menu === pane);
	};
	showPane(opts.pane ?? null);

	// Splash: any click or key reveals the menu (and lets audio start)
	const splash = el.querySelector("#splash") as HTMLElement | null;
	const begin = () => {
		if (!splash || splash.classList.contains("gone")) return;
		unlockAudio();
		splash.classList.add("gone");
		el.querySelector("#titleUi")?.classList.add("on");
		window.removeEventListener("keydown", onKey);
		opts.onBegin?.();
		setTimeout(() => splash.remove(), 1000);
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " " || e.key === "Escape") e.preventDefault();
		begin();
	};
	if (splash) {
		splash.addEventListener("click", begin);
		window.addEventListener("keydown", onKey);
		splash.focus();
	} else {
		opts.onBegin?.();
	}

	// ---- New game form ----
	const read = (): { options: GameOptions; style: TerrainStyle } => {
		const f = new FormData(form);
		const big = String(f.get("bigsize") || "");
		const preset = MAP_PRESETS[big || String(f.get("size"))] ?? MAP_PRESETS.medium;
		const seedText = String(f.get("seed") || "hexrealms").trim() || "hexrealms";
		const civ = String(f.get("civ") ?? "") as CivId | "";
		const players = Math.min(12, Math.max(2, Number(f.get("players")) || preset.players));
		const wins = {} as Record<VictoryType, boolean>;
		for (const v of Object.keys(VICTORY_LABELS) as VictoryType[]) wins[v] = f.get(`v_${v}`) === "on";
		const options = defaultOptions({
			width: preset.width,
			height: preset.height,
			players,
			seed: hashString(seedText),
			seedText,
			fog: String(f.get("fog") || "civ") as FogMode,
			lineOfSight: f.get("los") === "on",
			allowFounding: f.get("founding") === "on",
			tribeTechs: f.get("tribetech") === "on",
			raiders: f.get("raiders") === "on",
			buildGrowth: f.get("growth") === "on",
			difficulty: String(f.get("difficulty") || "normal") as Difficulty,
			turnLimit: f.get("turns") === "0" ? 0 : Number(f.get("turns")) || 60,
			victories: wins
		});
		if (civ) {
			// The chosen civ for player 0; the rest are shuffled by the game
			const rest = CIV_IDS.filter((c) => c !== civ);
			options.civs = [civ, ...rest.slice(0, players - 1)];
		}
		return { options, style: (String(f.get("style")) === "natural" ? "natural" : "tiles") as TerrainStyle };
	};
	const playersInput = form.querySelector("input[name=players]") as HTMLInputElement;
	const summary = () => {
		const f = new FormData(form);
		const big = String(f.get("bigsize") || "");
		const key = big || String(f.get("size"));
		const preset = MAP_PRESETS[key] ?? MAP_PRESETS.medium;
		const civ = String(f.get("civ") ?? "") as CivId | "";
		const wins = (Object.keys(VICTORY_LABELS) as VictoryType[]).filter((v) => f.get(`v_${v}`) === "on").length;
		const d = String(f.get("difficulty") || "normal");
		const html = `<b>${civ ? CIVS[civ].name : "Random tribe"}</b> &middot; ${preset.label.replace(" (sandbox)", "")} ${preset.width}&times;${preset.height} &middot; ${playersInput.value} civs &middot; ${d[0].toUpperCase()}${d.slice(1)} &middot; ${wins ? `${wins} victor${wins === 1 ? "y" : "ies"}` : `<span class="bad">no victory conditions</span>`}`;
		const s = el.querySelector("#newSummary");
		if (s) s.innerHTML = html;
		const fog = el.querySelector("#fogNote");
		if (fog) fog.textContent = FOG_NOTES[String(f.get("fog")) as FogMode] ?? "";
		const dn = el.querySelector("#difficultyNote");
		if (dn) dn.textContent = DIFFICULTY_NOTES[d as Difficulty] ?? "";
	};
	summary();
	form.addEventListener("change", (e) => {
		const t = e.target as HTMLInputElement;
		// A new map size suggests its usual number of civilisations
		if (t.name === "size" || t.name === "bigsize") {
			const preset = MAP_PRESETS[t.value];
			if (preset) playersInput.value = String(preset.players);
			if (t.name === "size") (form.querySelector("select[name=bigsize]") as HTMLSelectElement).value = "";
		}
		summary();
	});
	form.addEventListener("input", summary);
	form.querySelectorAll<HTMLButtonElement>(".stepper button").forEach((b) => b.addEventListener("click", () => {
		playersInput.value = String(Math.min(12, Math.max(2, (Number(playersInput.value) || 4) + Number(b.dataset.step))));
		summary();
	}));
	el.querySelector("#seedDice")?.addEventListener("click", () => {
		(form.querySelector("input[name=seed]") as HTMLInputElement).value = Math.random().toString(36).slice(2, 8);
	});

	// ---- Options ----
	el.querySelectorAll<HTMLInputElement>("input[data-vol]").forEach((r) => r.addEventListener("input", () => {
		const v = Number(r.value) / 100;
		if (r.dataset.vol === "music") setMusicVolume(v);
		else setSfxVolume(v);
		const out = r.parentElement?.querySelector("output");
		if (out) out.textContent = `${r.value}%`;
	}));
	el.querySelectorAll<HTMLInputElement>("input[data-opt]").forEach((c) => c.addEventListener("change", () => {
		if (c.dataset.opt === "tips") {
			if (c.checked) resetTips();
			else setTipsEnabled(false);
		} else if (c.dataset.opt === "motion") {
			try {
				localStorage.setItem("hexRealms.motion", c.checked ? "reduced" : "full");
			} catch {
				// ignore
			}
		}
	}));

	// ---- Saved games ----
	let list = saves;
	let confirm: string | null = null;
	const drawList = () => {
		const box = el.querySelector("#setupSaveList");
		if (box) box.innerHTML = saveList(list, { canSave: false, confirmDelete: confirm });
		const count = el.querySelector("#loadCount");
		if (count) count.textContent = list.length ? `${list.length} saved game${list.length === 1 ? "" : "s"}` : "No saves yet";
	};
	drawList();
	const reread = async () => {
		list = store ? await store.list().catch(() => list) : list;
		drawList();
	};
	const listError = (error: unknown) => {
		el.querySelector("#setupSaveList")?.insertAdjacentHTML("afterbegin", `<p class="bad small">${esc(error instanceof Error ? error.message : "Couldn't import that file")}</p>`);
	};
	el.querySelector("#setupImport")?.addEventListener("change", (e) => {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = "";
		if (file && store) void file.text().then((text) => store.importFile(text)).then(reread).catch(listError);
	});

	return new Promise((resolve) => {
		const done = (result: SetupResult) => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("keydown", onEsc);
			el.classList.add("hidden");
			el.innerHTML = "";
			resolve(result);
		};
		const onEsc = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || el.querySelector("#splash:not(.gone)")) return;
			if (el.querySelector(".title-pane:not(.hidden)")) showPane(null);
			else if (opts.inGame) done({ action: "cancel" });
		};
		window.addEventListener("keydown", onEsc);
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			done({ action: "new", ...read() });
		});
		el.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			const link = target.closest("[data-pane-link]") as HTMLElement | null;
			if (link) {
				e.preventDefault();
				showPane(link.dataset.paneLink as Pane);
				return;
			}
			const item = target.closest("[data-menu]") as HTMLElement | null;
			if (item) {
				const m = item.dataset.menu;
				if (m === "back") done({ action: "cancel" });
				else if (m === "continue") done({ action: "load", id: list[0]?.id });
				else showPane(m as Pane);
				return;
			}
			const btn = target.closest("[data-action]") as HTMLElement | null;
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
		const nameOf = () => {
			const name = String(new FormData(form).get("name") || "Player").trim().slice(0, 24) || "Player";
			try {
				localStorage.setItem(NAME_KEY, name);
			} catch {
				// ignore
			}
			return name;
		};
		el.querySelector("#setupHost")?.addEventListener("click", () => {
			const f = new FormData(form);
			done({ action: "host", ...read(), name: nameOf(), turnSeconds: Number(f.get("timer")) || 0 });
		});
		el.querySelector("#setupJoin")?.addEventListener("click", () => {
			const code = String(new FormData(form).get("code") || "").trim().toUpperCase();
			if (code) done({ action: "join", code, name: nameOf(), style: read().style });
			else (form.querySelector("input[name=code]") as HTMLInputElement | null)?.focus();
		});
	});
}
