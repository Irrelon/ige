import type { IgeViewport } from "@/engine/core/IgeViewport";
import type { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { FOGGED, type FogMode, UNEXPLORED } from "../fog";
import { captureProblem, foundProblem, slotCap, slotsUsed, trainProblem, unitCost } from "../sim/cities";
import { attackProblem, preview } from "../sim/combat";
import { buildingStars, buildOptions, buyCost, buyProblem, roadProblem, rushCost, rushProblem, storedGoods, wonderOptions } from "../sim/economy";
import { researchCost } from "../sim/effects";
import { buildingPop, harvestProblem } from "../sim/growth";
import { campAt, campBounty } from "../sim/raiders";
import {
	AMBITIONS, type BuildingId, BUILDINGS, DEPOSIT_NAMES, Deposit, type EndableTreaty, END_TRUCE_TURNS, GOOD_INFO, GOODS, type Good, type Goods, growthNeeded, HARVEST, levelRewards, REWARDS, ROAD_COST,
	eraOfTier, type TechId, TECH_IDS, TECHS, UNIT_LOOK, UNIT_TYPE_IDS, type UnitTypeId, UNIT_TYPES, WONDER_IDS
} from "../sim/rules";
import type { Sim } from "../sim/sim";
import { cityIncome, freeUnits, income, upkeepFactor } from "../sim/treasury";
import { ALLIANCE, type Command, type DealKind, NEUTRAL, PEACE, type SimEvent, WAR } from "../sim/types";
import { ambitionScore } from "../sim/ambitions";
import { score } from "../sim/victory";
import { wondersOf } from "../sim/effects";
import { FEATURE_NAMES, type Relief, RELIEF_NAMES, type Terrain, TERRAIN_INFO } from "../terrain";
import type { TerrainView } from "../view/terrainView";
import type { WorldView } from "../view/worldView";
import { dealName, DiplomacyScreen } from "./diplomacyScreen";
import { esc, goodChip, goodsInline, goodsList, setHtml, stars, updateHtml } from "./html";
import { play } from "./sfx";
import { markTipSeen, nextTip, resetTips, setTipsEnabled, tipsEnabled } from "./tips";
import { setSoundEnabled, soundEnabled } from "./sfx";
import { ambitionsModal, wondersModal } from "./wondersScreen";
import type { SaveKind, SaveMeta, SaveStore } from "../saves";
import { savesModal } from "./savesScreen";
import { emblem, icon } from "./icons";
import { getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume } from "./audio";
import { contactModal } from "./contact";
import { chartHover, historyChart, historyModal, shownCivs } from "./historyScreen";
import type { HistoryMetric } from "../sim/history";
import { fortifyProblem, hasOrders, isReady, sleepProblem, upgradeCost, upgradeProblem, UPGRADES } from "../sim/orders";
import { renameProblem } from "../sim/cities";
import { type ChatLine, type RoomInfo, TURN_TIMERS } from "../net/protocol";

/** What the HUD needs from the game controller. */
/** What a tech allows beyond its buildings, units and wonders (shown when it's selected in the research screen). */
const TECH_ABILITIES: Partial<Record<TechId, { icon: string; name: string; text: string }[]>> = {
	sailing: [{ icon: "&#x26F5;", name: "Embarking", text: "Units can move onto coastal water, where they sail in boats. Ports join your cities across the water with sea lanes." }],
	navigation: [{ icon: "&#x1F30A;", name: "Deep ocean", text: "Units and ships can cross deep ocean, so sea lanes can reach other continents." }],
	trade: [{ icon: "&#x1F91D;", name: "Trade agreements", text: "Barter goods and stars with other civs, and set up trade routes that deliver every turn." }],
	logistics: [{ icon: "&#x1F434;", name: "Pack animals", text: "Units move further along roads: a third of a move per step instead of a half." }],
	diplomacy: [{ icon: "&#x1F91D;", name: "Treaties and deals", text: "Opens the diplomacy screen's deals: alliances, open borders, defensive pacts, cultural exchanges, research agreements, barter, gifts, demands, denouncing and sanctions. Before it you can only declare war and make peace." }],
	statecraft: [{ icon: "&#x1F3DB;&#xFE0F;", name: "World Council", text: "The World Council forms and votes every few turns: win two elections in a row for a Diplomatic victory." }],
	engineering: [{ icon: "&#x1F4B0;", name: "Prosperity victory", text: "Lets you build the Grand Exchange: finishing it wins a Prosperity victory." }]
};

/** Where a building can go, for the research screen's descriptions. */
const SITE_TEXT: Record<string, string> = {
	forest: "in a forest", forestGame: "in a forest with game", quarry: "on hills or beside a mountain", mine: "on hills with ore, coal or gold",
	farmland: "on open flat grassland or plains", coastFish: "on the coast beside fish", coast: "on the coast", pasture: "on a horse herd",
	land: "on open land in your territory", city: "in a city"
};

/** Icons on unit badges. */
const UNIT_ICONS: Record<UnitTypeId, string> = {
	warrior: "&#x1FA93;", archer: "&#x1F3F9;", swordsman: "&#x2694;&#xFE0F;", settler: "&#x26FA;", rider: "&#x1F40E;", catapult: "&#x2604;&#xFE0F;",
	musketeer: "&#x1F4A5;", rifleman: "&#x1F396;&#xFE0F;", infantry: "&#x1FA96;", mechInfantry: "&#x1F6E1;&#xFE0F;", exoTrooper: "&#x1F916;",
	crossbowman: "&#x1F3AF;", machineGunner: "&#x1F525;", laserTrooper: "&#x26A1;",
	knight: "&#x265E;", cavalry: "&#x1F3C7;", tank: "&#x2699;&#xFE0F;", hoverTank: "&#x1F6F8;",
	trebuchet: "&#x1FAA8;", cannon: "&#x1F4A3;", artillery: "&#x1F9E8;", rocketArtillery: "&#x1F680;", railgun: "&#x1F531;"
};

/** How high above a unit's feet its badge floats (world units): just over the head of its model. */
const BASE_BADGE_HEIGHT = { warrior: 54, archer: 54, swordsman: 58, settler: 52, rider: 62, catapult: 48 };
const BADGE_HEIGHT = Object.fromEntries(UNIT_TYPE_IDS.map((t) => [t, BASE_BADGE_HEIGHT[UNIT_LOOK[t]]])) as Record<UnitTypeId, number>;

export interface HudHost {
	sim: Sim;
	player: number;
	renderer: IgeWebGlRenderer;
	viewport: IgeViewport;
	world: WorldView;
	terrain: TerrainView;
	selectedUnit: number | null;
	selectedTile: number;
	hoverTile: number;
	busy: boolean;
	replaying: boolean;
	online: boolean;
	reducedMotion: boolean;
	showStats: boolean;
	command (cmd: Command): boolean;
	selectUnit (id: number | null): void;
	selectTile (tile: number): void;
	centreOn (tile: number): void;
	endTurn (): void;
	nextUnit (): void;
	toggleStyle (): void;
	saves: SaveMeta[] | null;
	saveStore: SaveStore;
	canSave: boolean;
	saveGame (kind: SaveKind, name: string, id?: string): Promise<boolean>;
	loadGame (id: string): void;
	deleteSave (id: string): Promise<void>;
	exportSave (id: string): Promise<void>;
	importSave (file: File): Promise<void>;
	refreshSaves (): Promise<void>;
	newGame (): void;
	replay (): void;
	hasReplay (): boolean;
	setFogMode (mode: FogMode): void;
	setLineOfSight (on: boolean): void;
	setReducedMotion (on: boolean): void;
	setShowStats (on: boolean): void;
	setModels (on: boolean): void;
	models?: { enabled: boolean; models: Map<string, unknown>; infos: Record<string, unknown> };
	inviteLink (): string | null;
	room?: RoomInfo;
	chat: ChatLine[];
	sendChat (text: string): void;
	setTurnTimer (seconds: number, player?: number): void;
	leaveGame (): void;
	playerName (p: number): string;
}

/** A city's stores as a compact line of chips (most plentiful first) for the economy lens. */
function lensStore (store: Goods): string {
	const items = (Object.entries(store) as [Good, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
	return items.length ? `<div class="lens-store">${items.map(([g, n]) => goodChip(g, n)).join("")}</div>` : "";
}

/** Icons for the quick actions above a unit (24 x 24, drawn with the button's colour). */
const ICONS = {
	sleep: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>`,
	fortify: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>`,
	upgrade: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6M6 11.5l6-6 6 6"/><path d="M6 19.5h12"/></svg>`,
	capture: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 4L14 14M11 16.5L16.5 11M14 14L19 19M20 4L10 14M7.5 11L13 16.5M10 14L5 19"/></svg>`,
	found: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11L12 4L21 11M5.5 9.5V20H18.5V9.5M10 20V14.5H14V20"/></svg>`,
	pillage: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3C13 6.5 18 8.5 18 14A6 6 0 0 1 6 14C6 10.5 8.5 9.5 8.5 6.5C10 8 11 9.5 11.5 11.5C12.5 9 12.5 6 12 3Z"/></svg>`
};

/** How many notices the log keeps. */
const LOG_LIMIT = 400;

function quickButton (action: keyof typeof ICONS, title: string): string {
	return `<button data-action="${action}" aria-label="${esc(title)}" title="${esc(title)}">${ICONS[action]}</button>`;
}

export class Hud {
	host: HudHost;
	modal: string | null = null;
	/** Every notice shown this session (the Log screen), oldest first. */
	logEntries: { turn: number; html: string; kind: "info" | "good" | "bad"; seen?: boolean }[] = [];
	tipId: string | null = null;
	/** The metric the Rankings charts show. */
	historyMetric: HistoryMetric = "score";
	/** The city whose name is being edited (-1 = none). */
	renaming = -1;
	/** Civs met whose first-contact card hasn't been shown yet. */
	contacts: number[] = [];
	/** The civ on the first-contact card being shown. */
	contactCiv = -1;
	/** Cities of yours that levelled up, waiting to show their reward card (Polytopia-style). */
	levelUps: number[] = [];
	levelCity = -1;
	/** The save whose Delete is waiting for a second click. */
	saveConfirm: string | null = null;
	damage: { el: HTMLDivElement; tile: number; age: number; life?: number }[] = [];
	labels = new Map<string, HTMLDivElement>();
	/** Economy lens: building states and city stores drawn on the map. */
	lens = false;
	diplo = new DiplomacyScreen();
	/** The good chosen in a market's Buy list. */
	buyGood: Good = "planks";
	/** Online chat panel. */
	chatOpen = false;
	unread = 0;
	/** The tech the research screen was opened to show (from a locked building), and what needs it. */
	techFocus: { tech: TechId; for: string } | null = null;
	/** Techs still needed before the focused one. */
	techPath = new Set<TechId>();
	/** The unlock whose details show under the tech tree. */
	unlockChoice: string | null = null;

	constructor (host: HudHost) {
		this.host = host;
		document.addEventListener("click", (e) => {
			const el = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
			if (el && !(el as HTMLButtonElement).disabled) {
				e.preventDefault();
				this.action(el.dataset.action as string, el.dataset);
			}
		});
		// The deal editor's fields
		const edit = (e: Event) => {
			const el = e.target as HTMLInputElement;
			// Music and sound effect volumes (the menu)
			if (el?.dataset?.vol) {
				const v = Number(el.value) / 100;
				if (el.dataset.vol === "music") setMusicVolume(v);
				else setSfxVolume(v);
				const out = el.parentElement?.querySelector("output");
				if (out) out.textContent = `${el.value}%`;
				return;
			}
			if (el?.id === "saveImport") {
				const file = el.files?.[0];
				if (e.type === "change" && file) void this.host.importSave(file);
				el.value = "";
				return;
			}
			if (el?.dataset?.buy) {
				this.buyGood = el.value as Good;
				if (e.type === "change") this.refreshPanel();
				return;
			}
			const field = el?.dataset?.deal;
			if (!field) return;
			this.diplo.input(field, el.value, el.checked);
			setHtml("dealHint", this.diplo.hint(this.sim, this.me));
		};
		document.addEventListener("input", edit);
		document.addEventListener("change", edit);
		// Rankings charts: a crosshair and every civ's value under the pointer
		document.addEventListener("pointermove", (e) => {
			if ((e.target as HTMLElement)?.closest?.(".hchart")) chartHover(e);
			else document.querySelectorAll(".hchart .htip:not(.hidden), .hchart .cross:not(.hidden)").forEach((el) => el.classList.add("hidden"));
		});
		// Renaming a city: Enter saves, Escape cancels
		document.addEventListener("keydown", (e) => {
			const el = e.target as HTMLInputElement;
			if (el?.id !== "cityName") return;
			if (e.key === "Enter") {
				e.preventDefault();
				this.action("rename-save", { city: el.dataset.city });
			} else if (e.key === "Escape") {
				e.stopPropagation();
				this.action("rename-cancel", {});
			}
		});
		// Chat: Enter sends
		document.addEventListener("keydown", (e) => {
			const el = e.target as HTMLInputElement;
			if (el?.id !== "chatInput" || e.key !== "Enter") return;
			e.preventDefault();
			this.host.sendChat(el.value);
			el.value = "";
		});
		// The turn timer counts down between frames
		setInterval(() => {
			if (this.host.online && this.host.room?.deadline) this.refreshTopBar();
		}, 1000);
	}

	/** A chat line arrived (online). */
	chatLine (line: ChatLine): void {
		if (line.from !== this.me) {
			if (!this.chatOpen) this.unread++;
			const who = line.from < 0 ? "" : `<b>${esc(line.name)}</b>: `;
			this.toast(`${who}${esc(line.text)}`, "info", 6);
		}
		this.refreshChat();
		this.refreshTopBar();
	}

	toggleChat (): void {
		this.chatOpen = !this.chatOpen;
		this.unread = 0;
		this.refreshChat();
		this.refreshTopBar();
		if (this.chatOpen) (document.getElementById("chatInput") as HTMLInputElement | null)?.focus();
	}

	refreshChat (): void {
		const el = document.getElementById("chat");
		if (!el) return;
		const show = this.host.online && this.chatOpen;
		el.classList.toggle("hidden", !show);
		if (!show) return;
		const sim = this.sim;
		const lines = this.host.chat.slice(-40).map((l) => {
			if (l.from < 0) return `<div class="line sys">${esc(l.text)}</div>`;
			const color = sim.state.players[l.from]?.color ?? "#888";
			return `<div class="line"><span class="swatch" style="background:${color}"></span><b>${esc(l.name)}</b> ${esc(l.text)}</div>`;
		}).join("");
		const log = el.querySelector(".log");
		if (log) {
			log.innerHTML = lines || `<div class="dim small">No messages yet.</div>`;
			log.scrollTop = log.scrollHeight;
		}
	}

	get sim (): Sim {
		return this.host.sim;
	}

	get me (): number {
		return this.host.player;
	}

	// ------------------------------------------------------------------
	// Actions
	// ------------------------------------------------------------------

	action (name: string, data: DOMStringMap): void {
		const h = this.host;
		const unit = h.selectedUnit;
		const tile = h.selectedTile;
		const num = (k: string) => Number(data[k]);
		const run = (cmd: Command): boolean => {
			const done = h.command(cmd);
			if (done) this.refresh();
			return done;
		};
		switch (name) {
			case "capture": if (unit !== null) run({ type: "capture", unit }); break;
			case "found": if (unit !== null) run({ type: "found", unit }); break;
			case "pillage": if (unit !== null) run({ type: "pillage", unit }); break;
			case "disband": if (unit !== null) { run({ type: "disband", unit }); h.selectUnit(null); } break;
			case "train": run({ type: "train", city: num("city"), unit: data.unit as never }); break;
			case "reward": run({ type: "reward", city: num("city"), reward: data.reward as never }); break;
			case "build": run({ type: "build", tile, building: data.building as never }); break;
			case "harvest": run({ type: "harvest", tile }); break;
			case "rush": run({ type: "rush", building: num("building") }); break;
			case "buy": run({ type: "buy", building: num("building"), good: this.buyGood, count: num("count") }); break;
			case "demolish": run({ type: "demolish", building: num("building") }); break;
			case "road": run({ type: "road", tile: data.tile ? num("tile") : tile }); break;
			case "research": run({ type: "research", tech: data.tech as TechId }); this.openModal("tech"); break;
			case "show-tech": this.techFocus = { tech: data.tech as TechId, for: data.for ?? "" }; this.openModal("tech"); break;
			case "select-tech": {
				const t = data.tech as TechId;
				// Clicking the selected tech again clears the selection
				this.techFocus = this.techFocus?.tech === t && !this.techFocus.for ? null : { tech: t, for: "" };
				this.unlockChoice = null;
				this.openModal("tech");
				break;
			}
			case "unlock-info": this.unlockChoice = data.id ?? null; this.openModal("tech"); break;
			case "research-chain": {
				const chain = this.techChain(data.tech as TechId);
				for (const t of chain) {
					if (!h.command({ type: "research", tech: t })) break;
				}
				this.refresh();
				this.openModal("tech");
				break;
			}
			case "war": run({ type: "declareWar", target: num("player") }); this.openModal("diplomacy"); break;
			case "end-ask": this.diplo.confirmEnd = { civ: num("player"), kind: data.kind as EndableTreaty }; this.openModal("diplomacy"); break;
			case "end-cancel": this.diplo.confirmEnd = null; this.openModal("diplomacy"); break;
			case "end-treaty": this.diplo.confirmEnd = null; run({ type: "endTreaty", target: num("player"), kind: data.kind as EndableTreaty }); this.openModal("diplomacy"); break;
			case "propose": run({ type: "propose", to: num("player"), kind: data.kind as DealKind, stars: data.stars ? num("stars") : 0 }); this.openModal("diplomacy"); break;
			case "diplo-civ": this.diplo.civ = num("player"); this.diplo.confirmEnd = null; this.diplo.resetDraft(); this.openModal("diplomacy"); break;
			case "diplo-tab": this.diplo.setTab(data.tab ?? ""); this.openModal("diplomacy"); break;
			case "propose-deal":
			case "demand-tribute":
			case "demand-city":
			case "denounce":
			case "sanction": {
				const cmd = this.diplo.command(name, data);
				if (cmd && h.command(cmd)) {
					if (name === "propose-deal") this.diplo.resetDraft();
					this.refresh();
				}
				this.openModal("diplomacy");
				break;
			}
			case "ambition": run({ type: "ambition", ambition: data.ambition as never }); this.openModal("ambitions"); break;
			case "respond": run({ type: "respond", proposal: num("proposal"), accept: data.accept === "1" }); this.openModal("diplomacy"); break;
			case "sell": run({ type: "sell", good: data.good as Good, on: data.on === "1" }); this.openModal("economy"); break;
			case "priority": {
				const order = [...this.sim.player(this.me).priority];
				const i = order.indexOf(data.kind as never);
				if (i > 0) [order[i - 1], order[i]] = [order[i], order[i - 1]];
				run({ type: "priority", order });
				this.openModal("economy");
				break;
			}
			case "select-city": {
				const city = this.sim.city(num("city"));
				if (city) {
					h.selectTile(city.tile);
					h.centreOn(city.tile);
					this.closeModal();
				}
				break;
			}
			case "select-tile": h.selectTile(num("tile")); h.centreOn(num("tile")); this.closeModal(); break;
			case "modal": this.openModal(data.modal as string); break;
			case "close-modal": this.closeModal(); break;
			case "contact-ok": this.closeModal(); break;
			case "levelup-reward":
				run({ type: "reward", city: num("city"), reward: data.reward as never });
				this.closeModal();
				break;
			case "history-metric": this.historyMetric = data.metric as HistoryMetric; this.renderModal(); break;
			case "sleep": run({ type: "sleep", unit: h.selectedUnit as number }); break;
			case "fortify": run({ type: "fortify", unit: h.selectedUnit as number }); break;
			case "wake": run({ type: "wake", unit: h.selectedUnit as number }); break;
			case "upgrade": run({ type: "upgrade", unit: h.selectedUnit as number }); break;
			case "rename-city": this.renaming = num("city"); this.refreshPanel(); (document.getElementById("cityName") as HTMLInputElement | null)?.select(); break;
			case "rename-cancel": this.renaming = -1; this.refreshPanel(); break;
			case "rename-save": {
				const input = document.getElementById("cityName") as HTMLInputElement | null;
				if (input && run({ type: "renameCity", city: num("city"), name: input.value })) this.renaming = -1;
				this.refreshPanel();
				break;
			}
			case "contact-diplo": this.diplo.civ = num("player"); this.closeModal(); this.openModal("diplomacy"); break;
			case "lens": this.toggleLens(); break;
			case "chat": this.toggleChat(); break;
			case "timer": h.setTurnTimer(num("seconds"), data.player === undefined ? undefined : num("player")); break;
			case "leave": h.leaveGame(); this.closeModal(); break;
			case "endturn": h.endTurn(); break;
			case "nextunit": h.nextUnit(); break;
			case "style": h.toggleStyle(); this.refresh(); break;
			case "save-new": {
				const typed = (document.getElementById("saveName") as HTMLInputElement | null)?.value ?? "";
				void h.saveGame("manual", typed || this.defaultSaveName()).then((ok) => ok && this.toast("Game saved", "good", 2));
				break;
			}
			case "save-over": {
				const old = h.saves?.find((m) => m.id === data.id);
				const label = old?.kind === "manual" ? old.name : this.defaultSaveName();
				void h.saveGame("manual", label, data.id).then((ok) => ok && this.toast("Game saved", "good", 2));
				break;
			}
			case "save-load": h.loadGame(String(data.id)); break;
			case "save-export": void h.exportSave(String(data.id)); break;
			case "save-delete-ask": this.saveConfirm = String(data.id); this.renderModal(); break;
			case "save-delete-cancel": this.saveConfirm = null; this.renderModal(); break;
			case "save-delete": this.saveConfirm = null; void h.deleteSave(String(data.id)); break;
			case "save-import": (document.getElementById("saveImport") as HTMLInputElement | null)?.click(); break;
			case "newgame": h.newGame(); break;
			case "replay": this.closeModal(); h.replay(); break;
			case "fog": h.setFogMode(data.mode as FogMode); this.openModal("menu"); break;
			case "los": h.setLineOfSight(data.on === "1"); this.openModal("menu"); break;
			case "sound": setSoundEnabled(data.on === "1"); this.openModal("menu"); break;
			case "tips": if (data.on === "1") resetTips(); else setTipsEnabled(false); this.openModal("menu"); this.refreshTip(); break;
			case "motion": h.setReducedMotion(data.on === "1"); this.openModal("menu"); break;
			case "stats": h.setShowStats(data.on === "1"); this.openModal("menu"); break;
			case "models": h.setModels(data.on === "1"); this.openModal("menu"); break;
			case "tip-ok": if (this.tipId) markTipSeen(this.tipId); this.refreshTip(); break;
			case "tip-off": setTipsEnabled(false); this.refreshTip(); break;
			case "copy-invite": {
				const link = h.inviteLink();
				if (link) void navigator.clipboard?.writeText(link);
				this.toast("Invite link copied", "good");
				break;
			}
		}
	}

	// ------------------------------------------------------------------
	// Top bar and side panel
	// ------------------------------------------------------------------

	refresh (): void {
		this.refreshTopBar();
		this.refreshPanel();
		this.refreshTip();
		// (The save screen isn't redrawn by game events: it would lose what you're typing)
		if (this.modal && this.modal !== "gameover" && this.modal !== "saves") this.renderModal();
	}

	refreshTopBar (): void {
		const sim = this.sim, p = sim.player(this.me);
		const inc = income(sim, this.me);
		const current = sim.player(sim.current);
		const [tribe, banner] = p.name.split(" (");
		setHtml("civ", `<span class="crest" style="--c:${p.color}">${emblem(p.civ, 20)}</span><span class="civ-text">${esc(tribe)}<small>${esc((banner ?? "").replace(")", ""))} banner</small></span>`);
		setHtml("starsBox", `<span class="stars">${icon("star", 16)}${Math.floor(p.stars)}</span> <span class="${inc.net < 0 ? "bad" : "dim"}">${inc.net >= 0 ? "+" : ""}${inc.net}</span>`);
		const box = document.getElementById("starsBox");
		if (box) {
			const units = sim.unitsOf(this.me).length;
			box.title = [
				`Stars per turn: ${inc.net >= 0 ? "+" : ""}${inc.net}`,
				`Cities +${inc.cities}`,
				inc.wonders ? `Wonders +${inc.wonders}` : "",
				inc.legacy ? `Legacy +${inc.legacy}` : "",
				inc.treaties ? `Trade and exchanges +${inc.treaties}` : "",
				inc.sanctions ? `Sanctions -${inc.sanctions}` : "",
				`Unit upkeep -${inc.upkeep} (${units} units, ${freeUnits(sim, this.me)} free${upkeepFactor(sim, this.me) > 1 ? ", doubled for a modern army" : ""})`,
				inc.admin ? `Administration -${inc.admin} (cities beyond the 10th)` : ""
			].filter(Boolean).join("\n");
		}
		const limit = sim.options.victories.score ? ` / ${sim.options.turnLimit}` : "";
		const deadline = this.host.online ? this.host.room?.deadline ?? 0 : 0;
		const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
		const clock = deadline ? ` <span class="${left <= 15 ? "bad" : "dim"}" title="When the time runs out, the AI plays this turn">&#9201;${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}</span>` : "";
		setHtml("turnBox", `${icon("hourglass", 15)}<span>Turn <b>${sim.state.turn}</b><span class="dim">${limit}</span></span>${clock}`);
		const chat = document.getElementById("btnChat");
		if (chat) {
			chat.classList.toggle("hidden", !this.host.online);
			chat.classList.toggle("on", this.chatOpen);
			setHtml("btnChat", `${icon("chat")}<span class="lbl">Chat</span>${this.unread ? `<span class="badge">${this.unread}</span>` : ""}`);
		}
		const end = document.getElementById("endTurn") as HTMLButtonElement | null;
		if (end) {
			const myTurn = sim.current === this.me && !this.host.busy && !this.host.replaying && !sim.state.winner;
			end.disabled = !myTurn;
			const who = this.host.playerName(sim.current) || current.name.split(" (")[0];
			setHtml("endTurn", this.host.replaying ? "Replaying..." : sim.state.winner ? "Game over" : myTurn ? "End Turn" : `${esc(who)} is playing...`);
			const ready = myTurn ? this.readyUnits() : 0;
			end.classList.toggle("waiting", ready > 0);
			const next = document.getElementById("btnNext") as HTMLButtonElement | null;
			if (next) {
				next.disabled = !myTurn || ready === 0;
				setHtml("btnNext", `<span style="display:flex;align-items:center;gap:8px">${icon("next", 16)}Next unit</span><b class="${ready ? "" : "dim"}">${ready ? `${ready} ready` : "all done"}</b>`);
			}
		}
		const pending = sim.state.diplomacy.proposals.filter((pr) => pr.to === this.me).length;
		const nav = (id: string, ico: string, label: string, badge = "") => setHtml(id, `${icon(ico)}<span class="lbl">${label}</span>${badge}`);
		const badge = (n: number | string) => (n ? `<span class="badge">${n}</span>` : "");
		nav("btnTech", "research", "Research");
		nav("btnEconomy", "economy", "Economy");
		nav("btnLens", "lens", "Lens");
		nav("btnDiplo", "diplomacy", "Diplomacy", badge(pending));
		const rewards = sim.citiesOf(this.me).filter((c) => c.pendingRewards > 0).length;
		nav("btnCities", "cities", "Cities", badge(rewards));
		nav("btnAmbition", "ambition", p.ambition ? `Ambition <small>${p.milestones.length}/4</small>` : "Ambition", p.ambition ? "" : badge("!"));
		const amb = document.getElementById("btnAmbition");
		if (amb) amb.title = p.ambition ? `Ambition: ${AMBITIONS[p.ambition].name}, ${p.milestones.length} of 4 milestones (J)` : "Choose an ambition (J)";
		const earned = p.feats.filter((m) => !sim.state.buildings.some((b) => b.type === m && b.owner === this.me)).length;
		nav("btnWonders", "wonders", "Wonders", badge(earned));
		nav("btnHistory", "graph", "Rankings");
		setHtml("styleToggle", icon(this.host.terrain.style === "tiles" ? "terrain" : "map"));
		const style = document.getElementById("styleToggle");
		if (style) style.title = `Terrain look: ${this.host.terrain.style === "tiles" ? "Tiles" : "Natural"} (T to switch)`;
		setHtml("btnSave", icon("save"));
		setHtml("btnMenu", icon("menu"));
	}

	refreshPanel (): void {
		const parts: string[] = [];
		const sim = this.sim;
		const unitId = this.host.selectedUnit;
		const unit = unitId !== null ? sim.unit(unitId) : undefined;
		if (unit) parts.push(this.unitPanel(unitId as number));
		const tile = unit ? unit.tile : this.host.selectedTile;
		if (tile >= 0) {
			const city = sim.cityOn(tile);
			if (city && (!unit || unit.owner === this.me) && this.host.terrain.isExplored(tile)) parts.push(this.cityPanel(city.id));
			parts.push(this.tilePanel(tile, !!unit));
		}
		const hover = this.hoverLine();
		if (hover) parts.push(`<div class="hover">${hover}</div>`);
		setHtml("panel", parts.join("") || `<div class="dim">Select a unit, city or tile. <b>Space</b> selects your next unit.</div>`);
	}

	unitPanel (id: number): string {
		const sim = this.sim;
		const u = sim.unit(id)!;
		const info = UNIT_TYPES[u.type];
		const owner = sim.player(u.owner);
		const mine = u.owner === this.me;
		const whose = mine ? "" : esc(owner.name);
		const out = [`<div class="title"><span class="swatch" style="background:${owner.color}"></span>${info.name}${u.veteran ? ` <span class="stars" title="Veteran">${icon("star", 14)}</span>` : ""} <span class="dim">${whose}</span></div>`];
		if (u.owner < 0) out.push(`<div class="dim small">Outlaws from a camp nearby: they attack anything in reach. Scatter the camp to end the raids.</div>`);
		const stat = (cls: string, ico: string, value: string, title: string) => `<span class="stat ${cls}" title="${title}">${icon(ico, 14)}${value}</span>`;
		out.push(`<div class="statline">${[
			stat("hp", "heart", `${u.hp}<small>/${u.maxHp}</small>`, "Health"),
			stat("atk", "sword", String(info.attack), "Attack"),
			stat("def", "shield", String(info.defence), "Defence"),
			stat("rng", "range", String(info.range), "Range"),
			mine ? stat("mov", "moves", `${u.moves}<small>/${info.moves}</small>`, "Moves left this turn") : ""
		].join("")}</div>`);
		if (u.order === "fortify") out.push(`<div class="order-line">${icon("fortify", 14)} Fortified: ${sim.cityOn(u.tile)?.owner === u.owner ? "+25" : "+50"}% defence</div>`);
		else if (u.order === "sleep") out.push(`<div class="order-line">${icon("sleep", 14)} Asleep until an enemy comes near</div>`);
		else if (u.goto !== undefined) out.push(`<div class="order-line">${icon("route", 14)} Marching to (${sim.map.col(u.goto)}, ${sim.map.row(u.goto)})</div>`);
		if (!mine) return `<section>${out.join("")}</section>`;
		const buttons: string[] = [];
		const capture = captureProblem(sim, this.me, id);
		const city = sim.cityOn(u.tile);
		if (city && city.owner !== this.me) buttons.push(btn("capture", "Capture", capture));
		if (info.founder) buttons.push(btn("found", "Found city", foundProblem(sim, this.me, u.tile)));
		const enemyRoad = sim.roads[u.tile] >= 0 && sim.roads[u.tile] !== this.me;
		const enemyBuilding = sim.buildingOn(u.tile);
		if (enemyRoad || (enemyBuilding && enemyBuilding.owner !== this.me)) buttons.push(btn("pillage", "Pillage", null));
		if (hasOrders(u)) buttons.push(btn("wake", u.goto !== undefined ? "Stop marching" : u.order === "sleep" ? "Wake" : "Stand down", null));
		else {
			if (!info.founder) buttons.push(btn("fortify", `${icon("fortify", 14)} Fortify`, fortifyProblem(sim, this.me, id)));
			buttons.push(btn("sleep", `${icon("sleep", 14)} Sleep`, sleepProblem(sim, this.me, id)));
		}
		const next = UPGRADES[u.type];
		if (next) {
			const problem = upgradeProblem(sim, this.me, id);
			// Only offer it once the new unit is researched
			const tech = UNIT_TYPES[next].tech;
			if (!tech || sim.hasTech(this.me, tech)) buttons.push(btn("upgrade", `${icon("upgrade", 14)} Upgrade to ${UNIT_TYPES[next].name} <small>${icon("star", 11)}${upgradeCost(u)}</small>`, problem));
		}
		buttons.push(btn("disband", "Disband", null, "ghost"));
		out.push(`<div class="actions">${buttons.join("")}</div>`);
		if (info.founder && foundProblem(sim, this.me, u.tile)) out.push(`<div class="dim small">${foundProblem(sim, this.me, u.tile)}</div>`);
		return `<section>${out.join("")}</section>`;
	}

	cityPanel (cityId: number): string {
		const sim = this.sim;
		const c = sim.city(cityId)!;
		if (c.owner !== this.me) {
			const who = c.owner < 0 ? "Neutral village" : esc(sim.player(c.owner).name);
			return `<section><div class="title">${c.capital ? "&#9733; " : ""}${esc(c.name)} <span class="dim">level ${c.level} &middot; ${who}</span></div>${c.owner < 0 ? `<div class="dim small">Move a unit here and capture it at the start of your next turn.</div>` : ""}</section>`;
		}
		const need = growthNeeded(c.level);
		const earns = cityIncome(sim, c);
		const out = [this.renaming === c.id
			? `<div class="rename"><input id="cityName" maxlength="24" value="${esc(c.name)}" aria-label="City name" autocomplete="off" spellcheck="false" data-city="${c.id}"><button class="primary" data-action="rename-save" data-city="${c.id}">Save</button><button class="ghost" data-action="rename-cancel">Cancel</button>${renameProblem(sim, this.me, c.id, c.name) ? "" : ""}</div>`
			: `<div class="title">${c.capital ? `<span class="stars">${icon("crown", 15)}</span>` : ""}${esc(c.name)} <button class="ghost icon-btn rename-btn" data-action="rename-city" data-city="${c.id}" title="Rename this city" aria-label="Rename">${icon("edit", 14)}</button> <span class="dim">level ${c.level}${c.walls ? " &middot; walls" : ""}</span></div>`];
		out.push(`<div class="bar" title="${sim.options.buildGrowth ? "Growth: buildings finished in its land, fish and game harvested, and food delivered by road" : "Growth: deliver food"}"><span style="width:${(c.growth / need) * 100}%"></span><em>Growth ${c.growth}/${need}</em></div>`);
		out.push(`<div>Income ${stars(earns)}/turn &middot; Buildings ${slotsUsed(sim, c)}/${slotCap(c)} slots</div>`);
		out.push(`<div class="store">Store: ${goodsList(c.store, "empty")}</div>`);
		if (c.pendingRewards > 0) {
			const [a, b] = levelRewards(c.level);
			out.push(`<div class="reward">Level-up reward: ${[a, b].map((r) => `<button class="primary" data-action="reward" data-city="${c.id}" data-reward="${r}" title="${REWARDS[r].description}">${REWARDS[r].name}<small>${REWARDS[r].description}</small></button>`).join("")}</div>`);
		}
		// Units beyond the free allowance cost upkeep every turn
		const held = sim.unitsOf(this.me).reduce((n, u) => n + UNIT_TYPES[u.type].upkeep, 0);
		const overAllowance = held >= freeUnits(sim, this.me);
		const factor = upkeepFactor(sim, this.me);
		const trains = UNIT_TYPE_IDS.filter((t) => sim.hasTech(this.me, UNIT_TYPES[t].tech) && (!UNIT_TYPES[t].founder || sim.options.allowFounding)).map((t) => {
			const cost = unitCost(sim, this.me, t);
			const problem = trainProblem(sim, this.me, c.id, t);
			const goods = Object.entries(cost.goods).map(([g, n]) => `${n} ${g}`).join(", ");
			const upkeep = overAllowance ? `, &minus;${UNIT_TYPES[t].upkeep * factor}/turn` : "";
			return `<button data-action="train" data-city="${c.id}" data-unit="${t}" ${problem ? `disabled title="${esc(problem)}"` : `title="${esc(UNIT_TYPES[t].description)}"`}>${UNIT_TYPES[t].name} <small>&#9733;${cost.stars}${goods ? ` + ${goods}` : ""}${upkeep}</small></button>`;
		});
		out.push(`<div class="actions train"><span class="dim">Train:</span> ${trains.join("")}</div>`);
		if (overAllowance) out.push(`<div class="dim small">Your ${sim.unitsOf(this.me).length} units are over the free allowance of ${freeUnits(sim, this.me)}: each new one costs upkeep every turn.</div>`);
		return `<section>${out.join("")}</section>`;
	}

	tilePanel (tile: number, compact: boolean): string {
		const sim = this.sim;
		const view = this.host.terrain.fogView[tile];
		const coords = `<span class="dim small">(${sim.map.col(tile)}, ${sim.map.row(tile)})</span>`;
		if (view === UNEXPLORED) return `<section><div class="sub">Unexplored ${coords}</div></section>`;
		const out: string[] = [];
		// What stands here comes first: a building, wonder or monument (cities have their own panel above)
		const b = sim.buildingOn(tile);
		if (b) out.push(this.buildingPanel(b.id));
		out.push(`<div class="sub">${describeTile(sim, tile)}${view === FOGGED ? ` <span class="dim">(out of sight)</span>` : ""} ${coords}</div>`);
		const owner = sim.map.owner[tile];
		if (owner >= 0) out.push(`<div class="dim small">${esc(sim.player(owner).name)} territory${sim.roads[tile] >= 0 ? " &middot; road" : ""}</div>`);
		if (!compact && owner === this.me && !b && sim.cityAt[tile] < 0) {
			const options = buildOptions(sim, this.me, tile);
			if (options.length) {
				out.push(`<div class="actions build">${options.map(({ type, problem }) => {
					const info = BUILDINGS[type];
					const cost = `&#9733;${info.stars}${Object.keys(info.materials).length ? ` + ${goodsInline(info.materials)}` : ""}`;
					// Locked behind a technology: the reason links to it in the research screen
					if (info.tech && !sim.hasTech(this.me, info.tech)) {
						return `<span class="locked-option" title="${esc(info.description)}">${info.name} <small><a href="#" class="tech-link" data-action="show-tech" data-tech="${info.tech}" data-for="${esc(info.name)}" title="Show ${esc(TECHS[info.tech].name)} in the research screen">Needs ${esc(TECHS[info.tech].name)}</a></small></span>`;
					}
					const pop = buildingPop(sim, this.me, tile, type);
					const grows = pop ? ` <span class="pop" title="Adds ${pop} population when finished">+${pop}${icon("people", 11)}</span>` : "";
					return `<button data-action="build" data-building="${type}" title="${esc(problem ? `${problem}. ${info.description}` : info.description)}" ${problem ? "disabled" : ""}>${info.name}${grows} <small>${problem ? esc(problem) : cost}</small></button>`;
				}).join("")}</div>`);
			}
		}
		// Fish and game can be used up for growth (instead of building a fishery or lodge on them)
		const harvest = HARVEST[sim.map.deposit[tile] as Deposit];
		if (!compact && harvest && owner === this.me && !b && sim.options.buildGrowth) {
			const problem = harvestProblem(sim, this.me, tile);
			const city = sim.city(sim.tileCity[tile]);
			out.push(`<div class="actions">${btn("harvest", `${harvest.name} <span class="pop">+${harvest.pop}${icon("people", 11)}</span> <small>${icon("star", 11)}${harvest.stars}</small>`, problem)}</div>
				<div class="dim small">Uses the ${sim.map.deposit[tile] === Deposit.Fish ? "fish" : "game"} up: ${city ? esc(city.name) : "the city"} grows by ${harvest.pop} at once, but nothing can work it later.</div>`);
		}
		if (!compact && owner === this.me && !b && sim.cityAt[tile] < 0) {
			const wonders = wonderOptions(sim, this.me, tile);
			if (wonders.length) {
				out.push(`<div class="sub small">Wonders and monuments</div><div class="actions build">${wonders.map(({ type, problem }) => {
					const info = BUILDINGS[type];
					const cost = `&#9733;${buildingStars(sim, this.me, type)} + ${goodsInline(info.materials)}`;
					return `<button data-action="build" data-building="${type}" title="${esc(problem ? `${problem}. ${info.description}` : info.description)}" ${problem ? "disabled" : ""}>${info.name} <small>${problem ? esc(problem) : cost}</small></button>`;
				}).join("")}</div>`);
			}
		}
		if (!compact && owner === this.me && sim.cityAt[tile] >= 0 && !b) {
			const walls = buildOptions(sim, this.me, tile).find((o) => o.type === "walls");
			if (walls) out.push(`<div class="actions">${`<button data-action="build" data-building="walls" ${walls.problem ? `disabled title="${esc(walls.problem)}"` : ""}>City walls <small>&#9733;${BUILDINGS.walls.stars} + ${goodsInline(BUILDINGS.walls.materials)}</small></button>`}</div>`);
		}
		if (!compact && sim.roads[tile] < 0 && sim.cityAt[tile] < 0) {
			const problem = roadProblem(sim, this.me, tile);
			if (problem === null || /star/.test(problem)) out.push(`<div class="actions">${btn("road", `Build road <small>&#9733;${ROAD_COST}</small>`, problem)}</div>`);
		}
		return `<section>${out.join("")}</section>`;
	}

	buildingPanel (id: number): string {
		const sim = this.sim;
		const b = sim.building(id)!;
		const info = BUILDINGS[b.type];
		const mine = b.owner === this.me;
		const kind = info.wonder === "world" ? "World wonder: " : info.wonder === "monument" ? "Monument: " : "";
		const out = [`<div class="title">${info.name} <span class="dim">${b.built ? (b.status ? esc(b.status) : info.wonder ? "standing" : "working") : "under construction"}${mine ? "" : ` &middot; ${esc(sim.player(b.owner).name)}`}</span></div>`];
		if (info.wonder) out.push(`<div class="small">${kind}${esc(info.description)}</div>`);
		if (!mine) return out.join("");
		if (!b.built) {
			out.push(`<div>Still needs: ${goodsList(b.needs, "nothing")}</div>`);
			const cost = rushCost(b);
			const problem = rushProblem(sim, this.me, b);
			out.push(`<div class="actions"><button data-action="rush" data-building="${b.id}" ${problem ? `disabled title="${esc(problem)}"` : ""}>Rush <small>${info.wonder === "world" ? "never for world wonders" : `&#9733;${cost}`}</small></button>${btnData("demolish", "Cancel", { building: b.id }, "ghost")}</div>`);
		} else {
			const ins = Object.keys(info.inputs) as Good[];
			if (ins.length) out.push(`<div class="small">In: ${goodsList(b.input)} &middot; needs ${ins.map((g) => GOOD_INFO[g].name).join(" + ")}</div>`);
			const outs = Object.keys(b.output);
			if (outs.length) out.push(`<div class="small">Waiting for a road: ${goodsList(b.output)}</div>`);
			if (b.type === "warehouse") out.push(`<div class="small">Stored: ${goodsList(b.store, "empty")}</div>`);
			if (b.type === "market") {
				const p = sim.player(this.me);
				const goods = GOODS.filter((g) => g !== "coins" && !p.sell.includes(g));
				if (!goods.includes(this.buyGood)) this.buyGood = goods[0];
				const options = goods.map((g) => `<option value="${g}" ${g === this.buyGood ? "selected" : ""}>${GOOD_INFO[g].name} (&#9733;${buyCost(g, 1)} each)</option>`).join("");
				const buy = (count: number) => {
					const problem = buyProblem(sim, this.me, b.id, this.buyGood, count);
					return `<button data-action="buy" data-building="${b.id}" data-count="${count}" ${problem ? `disabled title="${esc(problem)}"` : ""}>Buy ${count} <small>&#9733;${buyCost(this.buyGood, count)}</small></button>`;
				};
				out.push(`<div class="small dim">Buy goods here at twice the market price; they go by road where they're needed.</div><div class="actions"><select data-buy="good" aria-label="Good to buy">${options}</select>${buy(1)}${buy(5)}</div>`);
			}
			out.push(`<div class="actions">${btnData("demolish", "Demolish", { building: b.id }, "ghost")}</div>`);
		}
		return out.join("");
	}

	/** Hovered tile, with a combat preview when the selected unit could attack it. */
	hoverLine (): string {
		const sim = this.sim;
		const t = this.host.hoverTile;
		if (t < 0) return "";
		const unitId = this.host.selectedUnit;
		const unit = unitId !== null ? sim.unit(unitId) : undefined;
		const target = sim.unitOn(t);
		if (unit && unit.owner === this.me && target && target.owner !== this.me && this.host.terrain.fogView[t] === 2) {
			const problem = attackProblem(sim, unit, t);
			if (!problem) {
				const r = preview(sim, unit, target);
				const starts = sim.relation(this.me, target.owner) === NEUTRAL ? ` <span class="bad">Starts a war with ${esc(sim.player(target.owner).name)}</span>` : "";
				return `Attack ${UNIT_TYPES[target.type].name}: deal <b>${r.damage}</b>${r.kills ? " (kills)" : ""}, take <b>${r.retaliation}</b>${r.dies ? " (your unit dies)" : ""}${starts}`;
			}
			return `${UNIT_TYPES[target.type].name} (${esc(sim.player(target.owner).name)}): ${problem}`;
		}
		if (t === this.host.selectedTile || (unit && t === unit.tile)) return "";
		if (this.host.terrain.fogView[t] === UNEXPLORED) return "Unexplored";
		return describeTile(sim, t);
	}

	// ------------------------------------------------------------------
	// Tips
	// ------------------------------------------------------------------

	refreshTip (): void {
		const el = document.getElementById("tips");
		if (!el) return;
		const tip = this.host.replaying || this.host.online && this.sim.current !== this.me ? null : nextTip(this.sim, this.me);
		this.tipId = tip?.id ?? null;
		if (!tip || !tipsEnabled()) {
			el.classList.add("hidden");
			return;
		}
		el.classList.remove("hidden");
		el.innerHTML = `<div class="tip-title">Advisor</div><div>${tip.text}</div><div class="actions"><button class="primary" data-action="tip-ok">Got it</button><button class="ghost" data-action="tip-off">Hide tips</button></div>`;
	}

	// ------------------------------------------------------------------
	// Notifications
	// ------------------------------------------------------------------

	toast (html: string, kind: "info" | "good" | "bad" = "info", seconds = 4, logHtml = html): void {
		this.logEntries.push({ turn: this.sim.state.turn, html: logHtml, kind });
		if (this.logEntries.length > LOG_LIMIT) {
			this.logEntries.splice(0, this.logEntries.length - LOG_LIMIT);
		}
		if (this.modal === "log") this.renderModal();
		this.refreshLogButton();
		const box = document.getElementById("toasts");
		if (!box) return;
		const el = document.createElement("div");
		el.className = `toast ${kind}`;
		el.innerHTML = `<span class="ti">${icon(kind === "good" ? "check" : kind === "bad" ? "warning" : "info", 14)}</span><div class="tb">${html}</div>`;
		box.appendChild(el);
		setTimeout(() => el.classList.add("fade"), seconds * 1000);
		setTimeout(() => el.remove(), seconds * 1000 + 600);
		while (box.children.length > 4) box.firstElementChild?.remove();
	}

	/** The Log button's badge: important notices (good or bad) not yet seen in the log. */
	refreshLogButton (): void {
		const unseen = this.logEntries.filter((e) => !e.seen && e.kind !== "info").length;
		setHtml("btnLog", `${icon("log")}<span class="lbl">Log</span>${unseen ? `<span class="badge">${unseen > 9 ? "9+" : unseen}</span>` : ""}`);
	}

	/** Every notice this session, newest first, grouped by turn. Opening it marks them seen. */
	logModal (): string {
		const groups: string[] = [];
		let turn = -1;
		for (let i = this.logEntries.length - 1; i >= 0; i--) {
			const e = this.logEntries[i];
			if (e.turn !== turn) {
				turn = e.turn;
				groups.push(`<h4>Turn ${turn}</h4>`);
			}
			// (a turn report starts with its own "Turn N" line, which the group heading already says)
			groups.push(`<div class="log-entry ${e.kind}">${e.html.replace(/^<b>Turn \d+<\/b><br>/, "")}</div>`);
			e.seen = true;
		}
		this.refreshLogButton();
		return `<h3>Log</h3>
			<div class="log-list">${groups.join("") || `<p class="dim">Nothing yet. Every notice that pops up during the game is kept here.</p>`}</div>`;
	}

	/** Turn events into toasts and sounds for the local player. */
	notify (events: SimEvent[]): void {
		const sim = this.sim, me = this.me;
		const name = (p: number) => (p < 0 ? "a village" : esc(sim.player(p).name));
		for (const e of events) {
			switch (e.type) {
				case "report":
					if (e.player === me && e.lines.length) {
						// The toast keeps to what's notable; the log keeps the whole report
						const routine = /^(Produced|Carriers delivered|Cities ate|Income:)/;
						const notable = e.lines.filter((l) => !routine.test(l));
						const earned = e.lines.find((l) => l.startsWith("Income:"));
						const full = `<b>Turn ${sim.state.turn}</b><br>${e.lines.map(esc).join("<br>")}`;
						const short = `<b>Turn ${sim.state.turn}</b>${earned ? ` <span class="dim">${esc(earned.replace("Income: ", ""))}</span>` : ""}${notable.length ? `<br>${notable.map(esc).join("<br>")}` : ""}`;
						this.toast(short, "info", notable.length ? 6 : 3.5, full);
						play("turn");
					}
					break;
				case "cityCaptured": {
					const c = sim.city(e.city);
					if (e.to === me) {
						this.toast(`Captured <b>${esc(c?.name ?? "a city")}</b>`, "good");
						play("capture");
					} else if (e.from === me) {
						this.toast(`${name(e.to)} captured <b>${esc(c?.name ?? "your city")}</b>!`, "bad", 6);
					}
					break;
				}
				case "cityFounded": {
					const c = sim.city(e.city);
					if (c?.owner === me) {
						this.toast(`Founded <b>${esc(c.name)}</b>`, "good");
						play("capture");
					}
					break;
				}
				case "campCleared":
					if (e.player === me) {
						this.toast(`Raider camp scattered: <b>+${e.stars}</b> ${icon("star", 13)}`, "good", 4);
						play("capture");
					}
					break;
				case "campFounded":
					if (this.host.terrain.fogView[e.tile] !== UNEXPLORED) this.toast("Raiders have made camp nearby", "bad", 4);
					break;
				case "population": {
					const c = sim.city(e.city);
					if (c?.owner === me && !this.host.replaying) this.floatGain(e.tile, `+${e.points} ${icon("people", 14)}<small>${esc(c.name)}</small>`);
					break;
				}
				case "cityLevel": {
					const c = sim.city(e.city);
					if (c?.owner === me) {
						play("level");
						if (this.host.replaying || this.host.online && sim.current !== me) this.toast(`<b>${esc(c.name)}</b> reached level ${e.level}: choose a reward`, "good");
						else {
							this.levelUps.push(c.id);
							this.nextContact();
						}
					}
					break;
				}
				case "tech":
					if (e.player === me) {
						this.toast(`Researched <b>${TECHS[e.tech].name}</b>: ${TECHS[e.tech].unlocks}`, "good");
						play("tech");
					}
					break;
				case "buildingCompleted": {
					const b = sim.building(e.building);
					if (b?.owner === me) play("build");
					break;
				}
				case "relation":
					if ((e.a === me || e.b === me) && e.relation === WAR) {
						this.toast(`War with ${name(e.a === me ? e.b : e.a)}!`, "bad", 6);
					} else if ((e.a === me || e.b === me) && e.relation === ALLIANCE) {
						this.toast(`Alliance with ${name(e.a === me ? e.b : e.a)}`, "good");
					} else if ((e.a === me || e.b === me) && e.relation === PEACE) {
						this.toast(`Peace with ${name(e.a === me ? e.b : e.a)}`, "good");
					}
					break;
				case "unitUpgraded": {
					const u = sim.unit(e.unit);
					if (u?.owner === me) {
						this.toast(`${UNIT_TYPES[e.from].name} upgraded to <b>${UNIT_TYPES[e.to].name}</b>`, "good", 3);
						play("level");
					}
					break;
				}
				case "orderEnded": {
					const u = sim.unit(e.unit);
					if (u?.owner === me && e.reason !== "arrived") this.toast(`${UNIT_TYPES[u.type].name} stopped marching: ${e.reason === "enemy" ? "enemies close by" : "the way is blocked"}`, "bad", 4);
					break;
				}
				case "met": {
					if (e.a !== me && e.b !== me) break;
					const other = e.a === me ? e.b : e.a;
					// AI leaders greet you (one card at a time); people just get a notice
					if (sim.player(other).human || this.host.replaying) this.toast(`You met ${name(other)}`, "info");
					else {
						this.logEntries.push({ turn: sim.state.turn, html: `You met ${name(other)}`, kind: "info" });
						this.contacts.push(other);
						this.nextContact();
					}
					break;
				}
				case "proposal":
					if (e.proposal.to === me) {
						const demand = e.proposal.kind === "tribute" || e.proposal.kind === "city";
						this.toast(`${name(e.proposal.from)} ${demand ? "<b>demands</b>" : "proposes"} <b>${dealName(e.proposal.kind)}</b>. Open Diplomacy (G) to answer.`, demand ? "bad" : "info", 6);
					}
					break;
				case "proposalResolved": {
					const pr = e.proposal;
					if (pr.from === me && pr.kind !== "gift") {
						const demand = pr.kind === "tribute" || pr.kind === "city";
						const extra = demand && !e.accepted ? ": you now have grounds for war" : "";
						this.toast(`${name(pr.to)} ${e.accepted ? (demand ? "gave in to" : "accepted") : demand ? "refused" : "declined"} ${demand ? "your demand" : dealName(pr.kind)}${extra}`, e.accepted ? "good" : "bad");
					}
					break;
				}
				case "diplomacyAction":
					if (e.to === me) this.toast(`${name(e.from)} ${e.kind === "denounce" ? "<b>denounced</b> you" : "imposed <b>sanctions</b> on you: your income drops for 10 turns"}`, "bad", 6);
					break;
				case "treatyEnded":
					if (e.to === me) {
						const what = {
							openBorders: "<b>closed their borders</b> to you: your units already in their land may stay, but no more can enter",
							trade: "ended your <b>trade agreement</b>",
							route: "stopped your <b>trade routes</b>",
							pact: `ended your <b>defensive pact</b> (a ${END_TRUCE_TURNS}-turn truce follows)`,
							alliance: `ended your <b>alliance</b>: you're at peace (a ${END_TRUCE_TURNS}-turn truce follows)`
						}[e.kind];
						this.toast(`${name(e.from)} ${what}`, "bad", 6);
					}
					if (e.from === me && e.lost) this.toast(`<b>${e.lost} of your units</b> in their land ${e.lost === 1 ? "was" : "were"} lost`, "bad", 6);
					break;
				case "wonder": {
					const info = BUILDINGS[e.building];
					if (info.wonder === "world") {
						if (e.player === me) this.toast(`You completed the <b>${info.name}</b>! ${esc(info.description)}`, "good", 7);
						else this.toast(`${name(e.player)} completed the <b>${info.name}</b>${e.lost.includes(me) ? ": your site is cancelled; its goods and half its stars come back" : ""}`, e.lost.includes(me) ? "bad" : "info", 6);
						if (e.player === me) play("victory");
					} else if (e.player === me) {
						this.toast(`Monument raised: <b>${info.name}</b>. ${esc(sim.city(e.city)?.name ?? "Its city")} grows a level.`, "good", 6);
						play("level");
					}
					break;
				}
				case "feat":
					if (e.player === me) this.toast(`Feat achieved: you may now build the <b>${BUILDINGS[e.building].name}</b> monument (Wonders, M)`, "good", 6);
					break;
				case "milestone": {
					const a = AMBITIONS[e.ambition];
					if (e.player === me) {
						if (e.legacy) this.toast(`Ambition complete! Legacy: <b>${a.legacy.name}</b>: ${esc(a.legacy.description)}${e.first ? " (first in the world)" : ""}`, "good", 8);
						else this.toast(`Milestone: <b>${esc(a.milestones[e.index].text)}</b>${e.first ? " &#9733; first in the world (double reward)" : ""}`, "good", 6);
						play("tech");
					} else if (e.first && sim.player(me).ambition === e.ambition) {
						this.toast(`${name(e.player)} reached "${esc(e.legacy ? `${a.name} legacy` : a.milestones[e.index].text)}" first`, "info", 5);
					}
					break;
				}
				case "council":
					this.toast(`World Council: ${e.winner >= 0 ? `${name(e.winner)} elected leader` : "no majority"}`, "info", 6);
					break;
				case "eliminated":
					this.toast(`${name(e.player)} has been destroyed`, e.player === me ? "bad" : "info", 6);
					break;
				case "attack":
					if (sim.unit(e.attacker)?.owner === me || sim.unit(e.defender)?.owner === me) play(e.killed ? "hit" : "attack");
					break;
				case "gameOver":
					this.openModal("gameover");
					play("victory");
					break;
			}
		}
	}

	// ------------------------------------------------------------------
	// Floating labels: city banners, health badges, damage numbers
	// ------------------------------------------------------------------

	floatDamage (tile: number, amount: number): void {
		if (!amount) return;
		const layer = document.getElementById("labels");
		if (!layer) return;
		const el = document.createElement("div");
		el.className = "damage";
		el.textContent = `-${amount}`;
		layer.appendChild(el);
		this.damage.push({ el, tile, age: 0 });
	}

	/** A green "+2 population" rising from a tile (buildings and harvests growing a city). */
	floatGain (tile: number, text: string): void {
		const layer = document.getElementById("labels");
		if (!layer) return;
		const el = document.createElement("div");
		el.className = "damage gain";
		el.innerHTML = text;
		layer.appendChild(el);
		this.damage.push({ el, tile, age: 0, life: 2 });
	}

	/**
	 * Quick actions floating above the selected unit, as in Polytopia: the
	 * crossed swords capture the city it stands on, the house founds a city,
	 * the flame pillages. Only actions the unit can take right now are shown.
	 */
	unitActions (): void {
		const el = document.getElementById("unitActions");
		if (!el) return;
		const h = this.host, sim = this.sim;
		const u = h.selectedUnit !== null ? sim.unit(h.selectedUnit) : undefined;
		const pos = u ? h.world.unitPosition(u.id) : null;
		const hide = () => {
			if (!el.classList.contains("hidden")) el.classList.add("hidden");
		};
		if (!u || !pos || !pos.shown || u.owner !== this.me || h.replaying || h.busy || sim.current !== this.me || sim.state.winner) return hide();
		const buttons: string[] = [];
		const city = sim.cityOn(u.tile);
		if (city && city.owner !== this.me && !captureProblem(sim, this.me, u.id)) buttons.push(quickButton("capture", `Capture ${city.name}`));
		if (UNIT_TYPES[u.type].founder && !foundProblem(sim, this.me, u.tile) && (u.moves > 0 || !u.acted)) buttons.push(quickButton("found", "Found a city here"));
		const road = sim.roads[u.tile];
		const building = sim.buildingOn(u.tile);
		const enemyBuilding = !!building && building.owner !== this.me && sim.atWar(this.me, building.owner);
		const enemyRoad = road >= 0 && road !== this.me && sim.atWar(this.me, road);
		if ((enemyBuilding || enemyRoad) && !u.attacked && u.moves > 0) {
			buttons.push(quickButton("pillage", `Pillage the ${enemyBuilding ? BUILDINGS[building!.type].name.toLowerCase() : "road"}`));
		}
		const next = UPGRADES[u.type];
		if (next && !upgradeProblem(sim, this.me, u.id)) buttons.push(quickButton("upgrade", `Upgrade to ${UNIT_TYPES[next].name} for ${upgradeCost(u)} stars (U)`));
		if (!buttons.length) return hide();
		// Above the unit, or above the city banner when it stands in a city (the banner's bottom
		// is drawn at the city height + 62 and it is about 24 px tall)
		const p = city
			? h.renderer.worldToScreen(h.viewport, h.world.tileX(city.tile), h.terrain.surface.tileHeight(city.tile) + 62, h.world.tileZ(city.tile))
			: h.renderer.worldToScreen(h.viewport, pos.x, pos.y + BADGE_HEIGHT[u.type], pos.z);
		if (!p || !p.visible) return hide();
		updateHtml(el, buttons.join(""));
		// (above the unit's badge, or above the city banner)
		el.style.transform = `translate(${p.x.toFixed(0)}px, ${(p.y - (city ? 30 : 24)).toFixed(0)}px) translate(-50%, -100%)`;
		el.classList.remove("hidden");
	}

	frame (dt: number): void {
		this.unitActions();
		const sim = this.sim, h = this.host, world = h.world;
		const renderer = h.renderer, viewport = h.viewport;
		const used = new Set<string>();
		const near = h.viewport.camera._translate.y < 2600;
		const label = (key: string, cls: string, html: string, x: number, y: number, z: number): void => {
			const p = renderer.worldToScreen(viewport, x, y, z);
			if (!p || !p.visible) return;
			let el = this.labels.get(key);
			if (!el) {
				el = document.createElement("div");
				el.className = cls;
				document.getElementById("labels")?.appendChild(el);
				this.labels.set(key, el);
			}
			updateHtml(el, html);
			el.style.transform = `translate(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px) translate(-50%, -100%)`;
			used.add(key);
		};

		for (const c of sim.state.cities) {
			if (!h.terrain.isExplored(c.tile) || (!near && c.owner < 0)) continue;
			const x = world.tileX(c.tile), z = world.tileZ(c.tile);
			const owner = c.owner >= 0 ? sim.player(c.owner) : null;
			// With the lens on, your cities also show what their stores hold
			const store = this.lens && c.owner === this.me ? lensStore(c.store) : "";
			const mineCity = c.owner === this.me;
			// Population: a pip per point, as in Polytopia (a bar when there are too many to read)
			const need = growthNeeded(c.level);
			const grow = !mineCity ? ""
				: need <= 12 ? `<i class="pips">${Array.from({ length: need }, (_, k) => `<u class="${k < c.growth ? "on" : ""}"></u>`).join("")}</i>`
					: `<i class="grow"><s style="width:${Math.min(100, Math.round((c.growth / need) * 100))}%"></s></i>`;
			const html = `<span style="--c:${owner?.color ?? "#777"}">${c.capital ? `<i class="cap">${icon("crown", 13)}</i>` : ""}${esc(c.name)}<b>${c.level}</b>${mineCity && c.pendingRewards ? `<i class="rw" title="Level-up reward waiting">${icon("star", 12)}</i>` : ""}</span>${grow}${store}`;
			label(`city${c.id}`, owner ? "city-label" : "city-label neutral", html, x, h.terrain.surface.tileHeight(c.tile) + 62, z);
		}
		if (this.lens && near) {
			for (const b of sim.buildingsOf(this.me)) {
				const info = BUILDINGS[b.type];
				const [cls, text] = !b.built
					? ["wait", `needs ${goodsInline(b.needs)}`]
					: b.status ? ["idle", esc(b.status)] : ["ok", Object.keys(info.outputs).length || b.type === "mine" ? "working" : "ready"];
				label(`lens${b.id}`, "lens-label", `<span class="${cls}"><b>${info.name}</b> ${text}</span>`, world.tileX(b.tile), h.terrain.surface.tileHeight(b.tile) + 40, world.tileZ(b.tile));
			}
		}
		if (near) {
			// Every unit's badge, as in Civilization: a shield in its owner's colour with an icon for its
			// type, its health when hurt (and a bar) and a star when it's a veteran
			for (const u of sim.state.units) {
				const pos = world.unitPosition(u.id);
				if (!pos || !pos.shown) continue;
				const hurt = u.hp < u.maxHp;
				const color = sim.player(u.owner).color;
				const bar = hurt ? `<em><s style="width:${Math.round((100 * u.hp) / u.maxHp)}%"></s></em>` : "";
				const order = u.owner === this.me ? (u.order === "sleep" ? `<q title="Asleep">z</q>` : u.order === "fortify" ? `<q title="Fortified">&#9960;</q>` : u.goto !== undefined ? `<q title="Marching">&#10140;</q>` : "") : u.order === "fortify" ? `<q title="Fortified">&#9960;</q>` : "";
				const html = `<span style="--c:${color}">${u.veteran ? "<u>&#9733;</u>" : ""}<i>${UNIT_ICONS[u.type]}</i>${hurt ? `<b>${u.hp}</b>` : ""}${order}</span>${bar}`;
				label(`unit${u.id}`, "ub", html, pos.x, pos.y + BADGE_HEIGHT[u.type], pos.z);
			}
		}
		for (const [key, el] of this.labels) {
			if (!used.has(key)) {
				el.remove();
				this.labels.delete(key);
			}
		}

		for (let i = this.damage.length - 1; i >= 0; i--) {
			const d = this.damage[i];
			d.age += dt;
			const life = d.life ?? 1.1;
			if (d.age > life) {
				d.el.remove();
				this.damage.splice(i, 1);
				continue;
			}
			const p = renderer.worldToScreen(viewport, world.tileX(d.tile), h.terrain.surface.tileHeight(d.tile) + 50 + d.age * 40, world.tileZ(d.tile));
			if (!p || !p.visible) continue;
			d.el.style.opacity = String(Math.min(1, (1 - d.age / life) * 1.6));
			d.el.style.transform = `translate(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px) translate(-50%, -50%)`;
		}
	}

	// ------------------------------------------------------------------
	// Modals
	// ------------------------------------------------------------------

	toggleLens (): void {
		this.lens = !this.lens;
		document.getElementById("btnLens")?.classList.toggle("on", this.lens);
		this.toast(this.lens ? "Economy lens on: building states and city stores are shown on the map (V)" : "Economy lens off", "info", 2.5);
	}

	openModal (kind: string): void {
		this.modal = kind;
		if (kind === "saves") {
			this.saveConfirm = null;
			void this.host.refreshSaves();
		}
		this.renderModal();
		if (kind === "saves") (document.getElementById("saveName") as HTMLInputElement | null)?.select();
	}

	/** Show the next first-contact card, then any level-up reward cards, unless another screen is open. */
	nextContact (): void {
		if (this.modal) return;
		if (this.contacts.length) {
			this.contactCiv = this.contacts.shift() as number;
			this.openModal("contact");
			return;
		}
		while (this.levelUps.length) {
			const c = this.sim.city(this.levelUps.shift() as number);
			if (!c || c.owner !== this.me || c.pendingRewards <= 0) continue;
			this.levelCity = c.id;
			this.openModal("levelup");
			return;
		}
	}

	/** A city grew a level: the two rewards on offer, as big cards (Polytopia-style). */
	levelUpModal (): string {
		const c = this.sim.city(this.levelCity);
		if (!c) return "";
		const REWARD_ICON: Record<string, string> = { income: "coin", income2: "coin", warrior: "sword", swordsman: "shield", borders: "map", walls: "fortify", store: "hammer" };
		const cards = levelRewards(c.level).map((r) => `<button class="reward-card" data-action="levelup-reward" data-city="${c.id}" data-reward="${r}">
			<span class="rc-icon">${icon(REWARD_ICON[r] ?? "star", 30)}</span><b>${REWARDS[r].name}</b><small>${REWARDS[r].description}</small></button>`).join("");
		const color = this.sim.player(this.me).color;
		return `<div class="levelup-card" style="--c:${color}">
			<div class="lu-level"><span>${c.level}</span></div>
			<div class="contact-kicker">City grew</div>
			<h2>${esc(c.name)}</h2>
			<div class="contact-banner">reached level ${c.level}: one more building slot${c.level % 2 ? "" : " and more star income"}. Choose a reward.</div>
			<div class="reward-cards">${cards}</div>
			<div class="contact-actions"><button class="ghost" data-action="contact-ok">Decide later (city panel)</button></div>
		</div>`;
	}

	/** Your units that can still move, attack or found a city this turn. */
	readyUnits (): number {
		return this.sim.unitsOf(this.me).filter(isReady).length;
	}

	/** "Highlanders (Azure), turn 26". */
	defaultSaveName (): string {
		return `${this.sim.player(this.me).name}, turn ${this.sim.state.turn}`;
	}

	/** The notice log from a saved game. */
	restoreLog (entries: Hud["logEntries"]): void {
		this.logEntries = entries.slice(-LOG_LIMIT).map((e) => ({ ...e, seen: true }));
		this.refreshLogButton();
	}

	closeModal (): void {
		this.modal = null;
		this.techFocus = null;
		document.getElementById("modal")?.classList.add("hidden");
		// Anyone else we met while that was open says hello now (then cities that grew)
		if (this.contacts.length || this.levelUps.length) setTimeout(() => this.nextContact(), 250);
	}

	renderModal (): void {
		const el = document.getElementById("modal");
		if (!el || !this.modal) return;
		let body = "";
		switch (this.modal) {
			case "tech": body = this.techModal(); break;
			case "diplomacy": body = this.diplo.render(this.sim, this.me, (p) => this.host.playerName(p)); break;
			case "wonders": body = wondersModal(this.sim, this.me); break;
			case "ambitions": body = ambitionsModal(this.sim, this.me); break;
			case "economy": body = this.economyModal(); break;
			case "cities": body = this.citiesModal(); break;
			case "menu": body = this.menuModal(); break;
			case "help": body = this.helpModal(); break;
			case "log": body = this.logModal(); break;
			case "history": body = historyModal(this.sim, this.me, this.historyMetric, !!this.sim.state.winner || this.sim.options.fog === "off", (p) => this.host.playerName(p) || this.sim.player(p).name); break;
			case "levelup": body = this.levelUpModal(); break;
			case "contact": body = contactModal(this.sim, this.contactCiv, this.me, this.host.playerName(this.contactCiv) || this.sim.player(this.contactCiv).name); break;
			case "saves": body = savesModal({ saves: this.host.saves, local: this.host.canSave, defaultName: this.defaultSaveName(), confirmDelete: this.saveConfirm, storage: this.host.saveStore.available }); break;
			case "gameover": body = this.gameOverModal(); break;
		}
		el.innerHTML = `<div class="modal-box ${this.modal}"><button class="close" data-action="close-modal" aria-label="Close">&times;</button>${body}</div>`;
		el.classList.remove("hidden");
		if (this.modal === "tech") {
			this.drawTechLinks(el);
			if (this.techFocus) el.querySelector(".tech.focus")?.scrollIntoView({ block: "center", inline: "center" });
			else {
				// Open on the player's frontier: the first tier with something left to research
				const p = this.sim.player(this.me);
				const frontier = Math.min(...TECH_IDS.filter((t) => !p.techs.includes(t)).map((t) => TECHS[t].tier), 99);
				const col = el.querySelector(`.tier[data-tier="${Math.max(1, frontier - 1)}"]`) as HTMLElement | null;
				const scroller = el.querySelector(".techs-scroll") as HTMLElement | null;
				if (col && scroller && frontier > 2) scroller.scrollLeft = col.offsetLeft - 8;
			}
		}
	}

	/**
	 * Lines from each tech to the techs that need it, drawn behind the cards:
	 * green between researched techs, bright from a researched tech to one it
	 * opens, dim between techs not yet in reach, gold along the path to a tech
	 * asked for. Hovering a card highlights its lines.
	 */
	drawTechLinks (root: HTMLElement): void {
		const box = root.querySelector(".techs") as HTMLElement | null;
		if (!box) return;
		const p = this.sim.player(this.me);
		const focus = this.techFocus?.tech;
		const onPath = (t: TechId) => t === focus || this.techPath.has(t);
		const base = box.getBoundingClientRect();
		const rect = (t: TechId) => box.querySelector(`.tech[data-tech="${t}"]`)?.getBoundingClientRect();
		const lines: string[] = [];
		for (const t of TECH_IDS) {
			const to = rect(t);
			if (!to) continue;
			for (const r of TECHS[t].requires) {
				const from = rect(r);
				if (!from) continue;
				const x1 = from.right - base.left, y1 = from.top + from.height / 2 - base.top;
				const x2 = to.left - base.left - 4, y2 = to.top + to.height / 2 - base.top;
				const dx = Math.max(18, (x2 - x1) * 0.5);
				const have = p.techs.includes(r);
				const cls = onPath(t) && onPath(r) ? "path" : have && p.techs.includes(t) ? "done" : have ? "open" : "locked";
				lines.push(`<path class="${cls}" data-from="${r}" data-to="${t}" d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)} ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" marker-end="url(#techArrow)"/>`);
			}
		}
		box.insertAdjacentHTML("afterbegin", `<svg class="tech-links" width="${box.scrollWidth}" height="${box.scrollHeight}" aria-hidden="true"><defs><marker id="techArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="context-stroke"/></marker></defs>${lines.join("")}</svg>`);
		box.onmouseover = (e) => {
			const card = (e.target as HTMLElement).closest(".tech") as HTMLElement | null;
			const t = card?.dataset.tech;
			box.querySelectorAll(".tech-links path[data-from]").forEach((el) => {
				const path = el as SVGPathElement;
				path.classList.toggle("hot", !!t && (path.dataset.from === t || path.dataset.to === t));
			});
		};
		box.onmouseleave = () => box.querySelectorAll(".tech-links path.hot").forEach((el) => el.classList.remove("hot"));
	}

	/**
	 * The techs to research to get `tech`, in order: its missing prerequisites
	 * (lowest tier first, each before anything that needs it), then the tech.
	 */
	techChain (tech: TechId): TechId[] {
		const p = this.sim.player(this.me);
		const out: TechId[] = [];
		const visit = (t: TechId): void => {
			if (p.techs.includes(t) || out.includes(t)) return;
			for (const r of [...TECHS[t].requires].sort((a, b) => TECHS[a].tier - TECHS[b].tier)) visit(r);
			out.push(t);
		};
		visit(tech);
		return out;
	}

	techModal (): string {
		const sim = this.sim, p = sim.player(this.me);
		const cities = sim.citiesOf(this.me).length;
		// The selected tech (clicked, or asked for from a locked building): it and the techs still needed
		// before it are highlighted
		const focus = this.techFocus?.tech;
		const chain = focus ? this.techChain(focus) : [];
		const path = new Set<TechId>(chain.filter((t) => t !== focus));
		this.techPath = path;
		const chainCost = (ts: TechId[]) => ts.reduce((n, t) => n + researchCost(sim, this.me, t), 0);
		const maxTier = Math.max(...TECH_IDS.map((t) => TECHS[t].tier));
		const tiers = Array.from({ length: maxTier }, (_, k) => k + 1).map((tier) => {
			const cards = TECH_IDS.filter((t) => TECHS[t].tier === tier).map((t) => {
				const tech = TECHS[t];
				const have = p.techs.includes(t);
				const ready = tech.requires.every((r) => p.techs.includes(r));
				const cost = researchCost(sim, this.me, t);
				const wonders = WONDER_IDS.filter((w) => BUILDINGS[w].tech === t).map((w) => BUILDINGS[w].name);
				const state = have ? "done" : ready ? (p.stars >= cost ? "ready" : "poor") : "locked";
				const req = tech.requires.length ? `<small>Needs ${tech.requires.map((r) => TECHS[r].name).join(", ")}</small>` : "";
				const mark = t === focus ? " focus" : path.has(t) ? " path" : "";
				const need = t === focus && this.techFocus?.for ? `<small class="need">Needed for ${esc(this.techFocus.for)}</small>` : path.has(t) ? `<small class="need">Research first</small>` : "";
				// Buying: this tech alone, or it with every prerequisite still missing, for their total
				let buy = "", chained = false;
				if (!have) {
					const steps = this.techChain(t);
					chained = steps.length > 1;
					const total = chainCost(steps);
					const short = total - p.stars;
					const label = steps.length > 1 ? `Buy all ${steps.length} &middot; &#9733;${total}` : `Buy &#9733;${total}`;
					const title = steps.length > 1
						? `Research ${steps.map((s2) => TECHS[s2].name).join(", then ")}: ${total} stars in total`
						: `Research ${tech.name} for ${total} stars`;
					buy = `<button class="buy${steps.length > 1 ? " chain" : ""}" data-action="research-chain" data-tech="${t}" ${short > 0 ? `disabled title="${esc(`${title}. You need ${short} more.`)}"` : `title="${esc(title)}"`}>${label}</button>`;
				}
				return `<div class="tech ${state}${mark}" data-action="select-tech" data-tech="${t}" role="button" tabindex="0" aria-pressed="${t === focus}"><div class="tech-head"><b>${tech.name}</b>${chained ? "" : buy}</div><small>${tech.unlocks}${wonders.length ? `; wonder: ${wonders.join(", ")}` : ""}</small>${have ? "<small>Researched</small>" : `<small>&#9733;${cost}</small>`}${have ? "" : req}${need}${chained ? `<div class="tech-foot">${buy}</div>` : ""}</div>`;
			});
			const era = eraOfTier(tier);
			const first = tier === 1 || eraOfTier(tier - 1) !== era;
			return `<div class="tier" data-tier="${tier}"><h4>${first ? `<span class="era">${era}</span>` : `<span class="era cont">${era}</span>`}Tier ${tier}</h4>${cards.join("")}</div>`;
		});
		let note = `<div class="tech-note dim">Click a tech to see what it needs; <b>Buy</b> researches it, with any techs it still needs first.</div>`;
		if (focus) {
			const name = TECHS[focus].name;
			const what = this.techFocus?.for ? `${esc(this.techFocus.for)} needs ` : "";
			if (p.techs.includes(focus)) {
				note = `<div class="tech-note">${what}<b>${name}</b>: researched.</div>`;
			} else {
				const total = chainCost(chain);
				const steps = chain.map((t) => `<b>${TECHS[t].name}</b> &#9733;${researchCost(sim, this.me, t)}`).join(" &rarr; ");
				const afford = p.stars >= total
					? `you have &#9733;${p.stars}, leaving &#9733;${p.stars - total}`
					: `you have &#9733;${p.stars}: <span class="bad">&#9733;${total - p.stars} short</span>`;
				note = `<div class="tech-note">${what ? `${what}<b>${name}</b>. ` : ""}${chain.length > 1 ? "Research " : ""}${steps}${chain.length > 1 ? ` = <b>&#9733;${total}</b> in total` : ""} (${afford}).</div>`;
			}
		}
		return `<h3>Research <span class="dim">${stars(p.stars)} available &middot; costs rise with your ${cities} cities</span></h3>${note}<div class="techs-scroll"><div class="techs" style="grid-template-columns:repeat(${maxTier}, minmax(178px, 1fr))">${tiers.join("")}</div></div>${this.techDetail(focus)}`;
	}

	/** Everything a tech unlocks: its buildings, units, wonders and other abilities. */
	techUnlocks (tech: TechId): { kind: "building" | "unit" | "wonder" | "ability"; id: string; name: string; thumb?: string; icon?: string; text: string }[] {
		const out: ReturnType<Hud["techUnlocks"]> = [];
		const thumbs = this.host.models?.infos ?? {};
		const thumb = (id: string) => (id in thumbs ? `./assets/models/thumbs/${id}.jpg` : undefined);
		for (const b of Object.values(BUILDINGS)) {
			if (b.tech !== tech || b.wonder === "monument") continue;
			out.push({ kind: b.wonder ? "wonder" : "building", id: b.id, name: b.name, thumb: thumb(b.id), icon: b.id === "walls" ? "&#x1F9F1;" : undefined, text: b.description });
		}
		for (const u of Object.values(UNIT_TYPES)) {
			if (u.tech === tech) out.push({ kind: "unit", id: u.id, name: u.name, thumb: thumb(u.id), text: u.description });
		}
		for (const a of TECH_ABILITIES[tech] ?? []) out.push({ kind: "ability", id: a.name, name: a.name, icon: a.icon, text: a.text });
		return out;
	}

	/** The full description of one thing a tech unlocks. */
	unlockDetail (u: ReturnType<Hud["techUnlocks"]>[number]): string {
		const sim = this.sim;
		if (u.kind === "unit") {
			const t = UNIT_TYPES[u.id as UnitTypeId];
			const cost = unitCost(sim, this.me, t.id);
			const goods = Object.entries(cost.goods).map(([g, n]) => `${n} ${g}`).join(", ");
			return `<b>${t.name}</b> <span class="dim">unit</span><div>${esc(t.description)}</div><div class="unit-stats">Health ${t.hp} &middot; Attack ${t.attack} &middot; Defence ${t.defence} &middot; Moves ${t.moves} &middot; Range ${t.range}</div><div class="dim">Train in a city for &#9733;${cost.stars}${goods ? ` + ${goods}` : ""}; upkeep ${t.upkeep} a turn beyond your free units.</div>`;
		}
		if (u.kind === "ability") return `<b>${u.name}</b> <span class="dim">ability</span><div>${u.text}</div>`;
		const b = BUILDINGS[u.id as BuildingId];
		const ins = Object.keys(b.inputs).length ? goodsInline(b.inputs) : "";
		const outs = Object.keys(b.outputs).length ? goodsInline(b.outputs) : b.id === "mine" ? "ore, coal or gold (whatever is in the hills)" : "";
		const makes = outs ? `<div>Makes ${outs} a turn${ins ? ` from ${ins}` : ""}.</div>` : "";
		const cost = `&#9733;${u.kind === "wonder" ? buildingStars(sim, this.me, b.id) : b.stars}${Object.keys(b.materials).length ? ` + ${goodsInline(b.materials)} delivered by road` : ""}`;
		const kind = u.kind === "wonder" ? "world wonder: one in the world, raced for, never rushed" : `building${b.slot ? ", uses a city building slot" : ""}`;
		return `<b>${b.name}</b> <span class="dim">${kind}</span><div>${esc(b.description)}</div>${makes}<div class="dim">Build ${SITE_TEXT[b.site] ?? ""} for ${cost}.</div>`;
	}

	/** The panel under the tech tree: what the selected tech unlocks, and the chosen item's details. */
	techDetail (tech: TechId | undefined): string {
		if (!tech) return `<div class="tech-detail empty dim">Select a tech to see what it unlocks.</div>`;
		const unlocks = this.techUnlocks(tech);
		if (!unlocks.length) return `<div class="tech-detail empty dim">${TECHS[tech].name}: ${esc(TECHS[tech].unlocks)}</div>`;
		const chosen = unlocks.find((u) => u.id === this.unlockChoice) ?? unlocks[0];
		const items = unlocks.map((u) => {
			const pic = u.thumb ? `<img src="${u.thumb}" alt="" loading="lazy">` : `<span class="icon">${u.icon ?? "&#x2726;"}</span>`;
			return `<button class="unlock${u === chosen ? " on" : ""}" data-action="unlock-info" data-id="${u.id}" title="${esc(`${u.name}: ${u.text.replace(/&[^;]+;/g, "")}`)}">${pic}<span>${u.name}</span><small>${u.kind === "wonder" ? "wonder" : u.kind}</small></button>`;
		}).join("");
		return `<div class="tech-detail"><h4>${TECHS[tech].name} unlocks</h4><div class="unlock-row"><div class="unlocks">${items}</div><div class="unlock-info">${this.unlockDetail(chosen)}</div></div></div>`;
	}

	economyModal (): string {
		const sim = this.sim, me = this.me, p = sim.player(me);
		const stock = storedGoods(sim, me);
		const hasMarket = sim.buildingsOf(me).some((b) => b.type === "market" && b.built);
		const canSell = sim.hasTech(me, "trade");
		const TIERS = ["Raw materials", "Crafted", "Advanced", "Industrial"];
		const tiers = [1, 2, 3, 4].map((tier) => {
			const cards = GOODS.filter((g) => GOOD_INFO[g].tier === tier).map((g) => {
				const n = stock[g] ?? 0;
				const selling = p.sell.includes(g);
				const sell = canSell ? `<button class="mini ${selling ? "on" : ""}" data-action="sell" data-good="${g}" data-on="${selling ? 0 : 1}" title="${hasMarket ? (selling ? "Stop selling" : "Sell at your markets") : "Build a market to sell goods"}">${selling ? "Selling" : "Sell"}</button>` : "";
				return `<div class="good-card${n ? "" : " empty"}"><div class="gc-top">${goodChip(g)}<b>${n}</b></div><div class="gc-foot"><span class="dim small">&#9733;${GOOD_INFO[g].price} each</span>${sell}</div></div>`;
			}).join("");
			return `<div class="tier-h">${TIERS[tier - 1]}</div><div class="goods-grid">${cards}</div>`;
		}).join("");
		const order = p.priority.map((k, i) => `<li>${k === "construction" ? "Construction sites" : k === "production" ? "Workshops' inputs" : "Food for cities"} ${i > 0 ? `<button class="mini" data-action="priority" data-kind="${k}" title="Move up">&uarr;</button>` : ""}</li>`).join("");
		const buildings = sim.buildingsOf(me).map((b) =>
			`<tr><td><a href="#" data-action="select-tile" data-tile="${b.tile}">${BUILDINGS[b.type].name}</a></td><td class="small">${b.built ? (b.status ? `<span class="warn">${esc(b.status)}</span>` : `<span class="good">Working</span>`) : `Building: needs ${goodsInline(b.needs)}`}</td><td class="small dim">${esc(sim.city(b.city)?.name ?? "")}</td></tr>`
		).join("");
		const inTransit = sim.state.cargo.filter((c) => c.owner === me).length;
		return `<h3>Economy</h3><p class="dim small eco-lede">Goods in your cities' stores. Anything joined to a city by road reaches it the same turn.${inTransit ? ` ${inTransit} loads are waiting on cut or blocked roads.` : ""}</p>
			${tiers}
			<div class="cols eco-cols"><div><h4>Who gets scarce goods first</h4><ol class="priority">${order}</ol></div>
			<div><h4>Buildings <button class="mini ${this.lens ? "on" : ""}" data-action="lens">Show on map (V)</button></h4><table>${buildings ? `<tr><th>Building</th><th>State</th><th>City</th></tr>${buildings}` : `<tr><td class="dim">None yet: click a tile in your territory.</td></tr>`}</table></div></div>`;
	}

	citiesModal (): string {
		const sim = this.sim, me = this.me;
		const rows = sim.citiesOf(me).sort((a, b) => Number(b.capital) - Number(a.capital) || b.level - a.level).map((c) => {
			const need = growthNeeded(c.level);
			const reward = c.pendingRewards ? ` <span class="pill gold">Reward</span>` : "";
			return `<tr>
				<td><a href="#" data-action="select-city" data-city="${c.id}">${c.capital ? `<span class="stars">${icon("crown", 13)}</span> ` : ""}${esc(c.name)}</a>${reward}</td>
				<td class="num">${c.level}</td>
				<td><div class="mini-bar" title="Growth ${c.growth}/${need}"><span style="width:${Math.min(100, (c.growth / need) * 100)}%"></span></div><span class="dim small">${c.growth}/${need}</span></td>
				<td class="num">${slotsUsed(sim, c)}/${slotCap(c)}</td>
				<td class="num">${stars(cityIncome(sim, c))}</td>
				<td class="small">${goodsList(c.store, `<span class="dim">Empty</span>`)}</td>
			</tr>`;
		}).join("");
		return `<h3>Your cities</h3><table class="city-table"><tr><th>City</th><th>Level</th><th>Growth</th><th>Slots</th><th>Income</th><th>Store</th></tr>${rows}</table>`;
	}

	menuModal (): string {
		const h = this.host, sim = this.sim;
		const o = sim.options;
		const toggle = (action: string, on: boolean, label: string) => `<button class="mini ${on ? "on" : ""}" data-action="${action}" data-on="${on ? 0 : 1}">${on ? "On" : "Off"}</button> ${label}`;
		const local = !h.online;
		const invite = h.inviteLink();
		return `<h3>Menu</h3>
			<div class="menu-actions">
				<button class="primary" data-action="modal" data-modal="saves">Save and load</button>
				<button data-action="newgame">New game</button>
				<button data-action="replay" ${h.hasReplay() ? "" : "disabled"}>Watch replay</button>
				<button data-action="modal" data-modal="help">Help</button>
				${invite ? `<button data-action="copy-invite">Copy invite link</button>` : ""}
				${h.online ? `<button class="ghost" data-action="leave" title="The AI plays your civ until you rejoin with the invite link">Leave game</button>` : ""}
			</div>
			${h.online && h.room ? `<h4>Online</h4>${this.timerMenu()}` : ""}
			<h4>Game options</h4>
			<div class="opts">
				<div>Fog of war: ${(["civ", "polytopia", "off"] as FogMode[]).map((m) => `<button class="mini ${o.fog === m ? "on" : ""}" data-action="fog" data-mode="${m}" ${local ? "" : "disabled"}>${m === "civ" ? "Civilization" : m === "polytopia" ? "Polytopia" : "Off"}</button>`).join(" ")}</div>
				<div>${local ? toggle("los", o.lineOfSight, "Line of sight") : `Line of sight: ${o.lineOfSight ? "on" : "off"}`}</div>
				<div class="dim small">Founding cities: ${o.allowFounding ? "allowed" : "off"} &middot; Tribe starting techs: ${o.tribeTechs === false ? "off" : "on"} &middot; Victories: ${Object.entries(o.victories).filter(([, v]) => v).map(([k]) => k).join(", ")} &middot; Difficulty: ${o.difficulty} &middot; Map ${o.width} x ${o.height}, seed "${esc(o.seedText)}"</div>
			</div>
			<h4>Settings</h4>
			<div class="opts">
				<label class="vol"><span>${icon("music", 16)} Music</span><input type="range" min="0" max="100" value="${Math.round(getMusicVolume() * 100)}" data-vol="music"><output>${Math.round(getMusicVolume() * 100)}%</output></label>
				<label class="vol"><span>${icon("sound", 16)} Sound effects</span><input type="range" min="0" max="100" value="${Math.round(getSfxVolume() * 100)}" data-vol="sfx"><output>${Math.round(getSfxVolume() * 100)}%</output></label>
				<div>${toggle("sound", soundEnabled(), "Sound")}</div>
				<div>${toggle("tips", tipsEnabled(), "Advisor tips")}</div>
				<div>${toggle("motion", h.reducedMotion, "Reduced motion (skip animations)")}</div>
				<div>${toggle("stats", h.showStats, "Performance stats")}</div>
				<div>${toggle("models", !!h.models?.enabled, `3D models <span class="dim small">(${h.models?.models.size ?? 0} loaded, the rest load when needed; off shows simple shapes)</span>`)}</div>
			</div>`;
	}

	/** Online: the game's turn timer and each player's own (the host sets any; players their own). */
	timerMenu (): string {
		const h = this.host, sim = this.sim, room = h.room as RoomInfo;
		const host = room.host === this.me;
		const label = (t: number) => (t ? `${t / 60} min` : "Off");
		const game = TURN_TIMERS.map((t) => `<button class="mini ${room.turnSeconds === t ? "on" : ""}" data-action="timer" data-seconds="${t}" ${host ? "" : "disabled title=\"Only the host sets the game's timer\""}>${label(t)}</button>`).join(" ");
		const rows = sim.state.players.filter((p) => p.alive && p.human).map((p) => {
			const own = room.seatSeconds[p.index];
			const allowed = host || p.index === this.me;
			const buttons = [-1, ...TURN_TIMERS].map((t) => {
				const on = t === -1 ? own === null || own === undefined : own === t;
				return `<button class="mini ${on ? "on" : ""}" data-action="timer" data-seconds="${t}" data-player="${p.index}" ${allowed ? "" : "disabled title=\"Only the host or this player can change it\""}>${t === -1 ? "Game's" : label(t)}</button>`;
			}).join(" ");
			const presence = room.online[p.index] ? `<span class="good">online</span>` : `<span class="dim">away</span>`;
			return `<tr><td><span class="swatch" style="background:${p.color}"></span>${esc(room.names[p.index] || "Player")}${p.index === this.me ? " (you)" : ""} ${presence}</td><td>${buttons}</td></tr>`;
		}).join("");
		const ai = sim.state.players.filter((p) => p.alive && !p.human).map((p) => `<span class="swatch" style="background:${p.color}"></span>${esc(p.name.split(" (")[0])}`).join(" ");
		return `<div class="opts"><div>Game turn timer: ${game}</div>
			<p class="dim small">When a player's time runs out, the AI plays their turn. Each player can also have their own timer: the host can set anyone's, and you can set yours (for example a short one while you step away).</p>
			<table class="timers">${rows}</table>
			${ai ? `<div class="small dim">Played by the AI: ${ai}</div>` : ""}</div>`;
	}

	helpModal (): string {
		const o = this.sim.options;
		const kbd = (k: string) => `<kbd>${k}</kbd>`;
		const card = (ico: string, title: string, key: string, body: string) => `<div class="help-card"><div class="hc-head">${icon(ico, 16)}<b>${title}</b>${key ? kbd(key) : ""}</div><p>${body}</p></div>`;
		const section = (title: string, cards: string[]) => `<h4>${title}</h4><div class="help-grid">${cards.join("")}</div>`;
		return `<h3>How to play</h3><div class="help">
			${section("Winning", [
		card("trophy", "Goal", "", "Win by Domination (last civ standing), Score (highest after the turn limit), Prosperity (finish the Grand Exchange), Alliance (everyone left is allied) or Diplomacy (win two World Council elections)."),
		card("ambition", "Ambition", "J", "Pick a goal to race for. Each milestone pays stars and score, double if you are the first civ to reach it; all four earn a permanent legacy."),
		card("wonders", "Wonders", "M", "A world wonder exists once, so civs race to finish it; monuments are earned by feats and raise their city a level.")
	])}
			${section("Cities and economy", [
		card("capture", "Expand", "", `Capture grey villages with any unit (start a turn on one, press Capture)${o.allowFounding ? ", or found cities with settlers" : ""}. Cities earn stars every turn.`),
		card("grow", "Grow", "", o.buildGrowth
			? "As in Polytopia, every building finished in a city's land adds population (shown as +N on the build buttons). Workshops add more for each neighbour that feeds them: a sawmill for each woodcutter beside it, a mill for each farm, a smelter two for each mine, a market for each workshop. Harvest fish and game for stars to grow a city at once. Food delivered by road adds growth too. Each level adds a building slot and a reward."
			: "Deliver food (fish, game, bread) to cities. Each level adds a building slot and a reward."),
		card("hammer", "Build", "", "Click your land to place buildings. Woodcutters are ready at once; other sites wait for logs, planks or stone carried by road, and Rush finishes them for stars. Anything joined to a city by road reaches it the same turn. Ports (Sailing) join coastal cities; a market also sells you goods at twice its price."),
		card("star", "Stars", "", "Units beyond your free allowance (3, plus 1 per city) cost upkeep every turn (doubled once you know 12 techs), and cities beyond your tenth cost administration. Hover your stars for the breakdown.")
	])}
			${section("Neighbours and war", [
		card("diplomacy", "Meeting civs", "", "A civ you have just met is unaligned: there's no treaty, so units of both sides may wander through each other's land, but nobody fights. The first attack starts a war. Make peace to close your borders to their soldiers."),
		card("diplomacy", "Diplomacy", "G", "Treaties, cultural exchanges, research agreements, trades of goods and stars (once, or every turn as a route), demands, denouncing and sanctions. Wars without enough grievances are surprise wars everyone resents; long wars make peace easier; peace brings a 10-turn truce."),
		card("sword", "Fight", "", "Attack an unaligned civ's unit, or declare war in Diplomacy. Select a unit to see red attack rings; hover one to preview the damage. Ranged units need line of sight. Units stop next to an enemy; defenders across a river get +25%."),
		...(o.raiders ? [card("camp", "Raiders", "", "Outlaw camps spring up on unclaimed land out of sight. Their raiders attack units and burn buildings and roads near the camp, but never take cities. Walk a unit into a camp to scatter it for a bounty of stars.")] : [])
	])}
			${section("Units", [
		card("capture", "Quick actions", "", "Buttons float above a selected unit when it can do something where it stands: crossed swords capture a city, a house founds one, a flame pillages."),
		card("route", "Orders", "", `Click a far tile to march a unit there over several turns (gold dots show the route). ${kbd("K")} sleep until an enemy comes near, ${kbd("I")} fortify for +50% defence, ${kbd("U")} upgrade inside your borders (warrior to swordsman with Smithing, and on through the eras). Click a city's name to rename it.`)
	])}
			<h4>Keys</h4><div class="help-keys">
				${[["Space", "Next unit"], ["Enter", "End turn"], ["Esc", "Deselect"], ["Ctrl/Cmd S", "Quicksave"], ["WASD", "Pan"], ["Z / X", "Zoom"], ["Q / E", "Rotate"], ["PgUp / PgDn", "Tilt"], ["C", "Centre"], ["T", "Terrain style"], ["R", "Research"], ["G", "Diplomacy"], ["J", "Ambition"], ["M", "Wonders"], ["B", "Economy"], ["V", "Economy lens"], ["L", "Cities"], ["Y", "Rankings"], ["N", "Log"], ["F", "Found city"], ["O", "Menu"], ["H", "Help"]]
		.map(([k, what]) => `<span>${kbd(k)} ${what}</span>`).join("")}
			</div></div>`;
	}

	gameOverModal (): string {
		const sim = this.sim, w = sim.state.winner;
		if (!w) return "";
		const names = w.players.map((p) => esc(sim.player(p).name)).join(" and ");
		const won = w.players.includes(this.me);
		const title = won ? "Victory!" : "Defeat";
		const how: Record<string, string> = {
			domination: "conquered the world", score: "had the highest score when time ran out", prosperity: "completed the Grand Exchange",
			alliance: "won together as allies", diplomatic: "was elected leader by the World Council twice"
		};
		const rows = sim.state.players.map((p) => {
			const held = wondersOf(sim, p.index);
			const ambition = p.ambition ? `${AMBITIONS[p.ambition].name} ${p.milestones.length}/4${p.legacy ? " &#9733;" : ""}` : "-";
			return `<tr><td><span class="swatch" style="background:${p.color}"></span>${esc(p.name)}</td><td>${score(sim, p.index)}</td><td>${sim.citiesOf(p.index).length} cities</td><td>${p.techs.length} techs</td><td>${held.world} wonders, ${held.monuments} monuments</td><td>${ambition} <small class="dim">(${ambitionScore(sim, p.index)})</small></td><td>${p.stats.produced} goods</td><td>${p.stats.kills} kills</td></tr>`;
		}).join("");
		const civs = shownCivs(sim, this.me, true);
		const tabs = (["score", "cities", "land", "military", "techs"] as HistoryMetric[]).map((m) => `<button class="${m === this.historyMetric ? "on" : ""}" data-action="history-metric" data-metric="${m}">${m[0].toUpperCase()}${m.slice(1)}</button>`).join("");
		const chart = `<h4>How the game went</h4><div class="dp-tabs htabs">${tabs}</div>${historyChart(sim, this.me, this.historyMetric, civs, (p) => this.host.playerName(p) || sim.player(p).name)}`;
		return `<h3>${title}</h3><p>${names} ${how[w.type]} on turn ${sim.state.turn}.</p><table>${rows}</table>${chart}<div class="menu-actions"><button class="primary" data-action="newgame">New game</button><button data-action="replay">Watch replay</button><button data-action="close-modal">Keep looking</button></div>`;
	}
}

function btn (action: string, label: string, problem: string | null, cls = ""): string {
	return `<button class="${cls}" data-action="${action}" ${problem ? `disabled title="${esc(problem)}"` : ""}>${label}</button>`;
}

function btnData (action: string, label: string, data: Record<string, string | number>, cls = ""): string {
	const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${v}"`).join(" ");
	return `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
}

export function describeTile (sim: Sim, tile: number): string {
	const map = sim.map;
	const parts = [TERRAIN_INFO[map.terrain[tile] as Terrain].name];
	const relief = RELIEF_NAMES[map.relief[tile] as Relief];
	const feature = FEATURE_NAMES[map.feature[tile] as keyof typeof FEATURE_NAMES];
	if (relief) parts.push(relief);
	if (feature) parts.push(feature);
	const deposit = DEPOSIT_NAMES[map.deposit[tile] as Deposit];
	if (deposit) parts.push(`<b>${deposit}</b>`);
	if (campAt(sim, tile)) parts.push(`<b class="bad">Raider camp</b> <span class="dim">(walk a unit in to scatter it for &#9733;${campBounty(sim)})</span>`);
	return parts.join(" &middot; ");
}

