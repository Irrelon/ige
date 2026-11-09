import type { IgeViewport } from "@/engine/core/IgeViewport";
import type { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { FOGGED, type FogMode, UNEXPLORED } from "../fog";
import { captureProblem, foundProblem, slotCap, slotsUsed, trainProblem, unitCost } from "../sim/cities";
import { attackProblem, preview } from "../sim/combat";
import { buildingStars, buildOptions, buyCost, buyProblem, carrierSpeed, roadCapacity, roadProblem, rushCost, rushProblem, storedGoods, wonderOptions } from "../sim/economy";
import { researchCost } from "../sim/effects";
import {
	AMBITIONS, BUILDINGS, DEPOSIT_NAMES, type Deposit, GOOD_INFO, GOODS, type Good, type Goods, growthNeeded, levelRewards, REWARDS, ROAD_COST,
	type TechId, TECH_IDS, TECHS, UNIT_TYPE_IDS, type UnitTypeId, UNIT_TYPES, WONDER_IDS
} from "../sim/rules";
import type { Sim } from "../sim/sim";
import { cityIncome, freeUnits, income, upkeepFactor } from "../sim/treasury";
import { ALLIANCE, type Command, type DealKind, type SimEvent, WAR } from "../sim/types";
import { ambitionScore } from "../sim/ambitions";
import { score } from "../sim/victory";
import { wondersOf } from "../sim/effects";
import { FEATURE_NAMES, type Relief, RELIEF_NAMES, type Terrain, TERRAIN_INFO } from "../terrain";
import type { TerrainView } from "../view/terrainView";
import type { WorldView } from "../view/worldView";
import { dealName, DiplomacyScreen } from "./diplomacyScreen";
import { esc, goodChip, goodsInline, goodsList, setHtml, stars } from "./html";
import { play } from "./sfx";
import { markTipSeen, nextTip, resetTips, setTipsEnabled, tipsEnabled } from "./tips";
import { setSoundEnabled, soundEnabled } from "./sfx";
import { ambitionsModal, wondersModal } from "./wondersScreen";
import { type ChatLine, type RoomInfo, TURN_TIMERS } from "../net/protocol";

/** What the HUD needs from the game controller. */
/** Icons on unit badges. */
const UNIT_ICONS: Record<UnitTypeId, string> = {
	warrior: "&#x1FA93;", archer: "&#x1F3F9;", swordsman: "&#x2694;&#xFE0F;", settler: "&#x26FA;", rider: "&#x1F40E;", catapult: "&#x2604;&#xFE0F;"
};

/** How high above a unit's feet its badge floats (world units): just over the head of its model. */
const BADGE_HEIGHT: Record<UnitTypeId, number> = { warrior: 54, archer: 54, swordsman: 58, settler: 52, rider: 62, catapult: 48 };

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
	save (): void;
	load (): void;
	newGame (): void;
	replay (): void;
	hasSave (): boolean;
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
	capture: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 4L14 14M11 16.5L16.5 11M14 14L19 19M20 4L10 14M7.5 11L13 16.5M10 14L5 19"/></svg>`,
	found: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11L12 4L21 11M5.5 9.5V20H18.5V9.5M10 20V14.5H14V20"/></svg>`,
	pillage: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3C13 6.5 18 8.5 18 14A6 6 0 0 1 6 14C6 10.5 8.5 9.5 8.5 6.5C10 8 11 9.5 11.5 11.5C12.5 9 12.5 6 12 3Z"/></svg>`
};

function quickButton (action: keyof typeof ICONS, title: string): string {
	return `<button data-action="${action}" aria-label="${esc(title)}" title="${esc(title)}">${ICONS[action]}</button>`;
}

export class Hud {
	host: HudHost;
	modal: string | null = null;
	tipId: string | null = null;
	damage: { el: HTMLDivElement; tile: number; age: number }[] = [];
	labels = new Map<string, HTMLDivElement>();
	/** Economy lens: building states and city stores drawn on the map. */
	lens = false;
	diplo = new DiplomacyScreen();
	/** The good chosen in a market's Buy list. */
	buyGood: Good = "planks";
	/** Online chat panel. */
	chatOpen = false;
	unread = 0;

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
		const run = (cmd: Command) => {
			if (h.command(cmd)) this.refresh();
		};
		switch (name) {
			case "capture": if (unit !== null) run({ type: "capture", unit }); break;
			case "found": if (unit !== null) run({ type: "found", unit }); break;
			case "pillage": if (unit !== null) run({ type: "pillage", unit }); break;
			case "disband": if (unit !== null) { run({ type: "disband", unit }); h.selectUnit(null); } break;
			case "train": run({ type: "train", city: num("city"), unit: data.unit as never }); break;
			case "reward": run({ type: "reward", city: num("city"), reward: data.reward as never }); break;
			case "build": run({ type: "build", tile, building: data.building as never }); break;
			case "rush": run({ type: "rush", building: num("building") }); break;
			case "buy": run({ type: "buy", building: num("building"), good: this.buyGood, count: num("count") }); break;
			case "demolish": run({ type: "demolish", building: num("building") }); break;
			case "road": run({ type: "road", tile: data.tile ? num("tile") : tile }); break;
			case "research": run({ type: "research", tech: data.tech as TechId }); this.openModal("tech"); break;
			case "war": run({ type: "declareWar", target: num("player") }); this.openModal("diplomacy"); break;
			case "propose": run({ type: "propose", to: num("player"), kind: data.kind as DealKind, stars: data.stars ? num("stars") : 0 }); this.openModal("diplomacy"); break;
			case "diplo-civ": this.diplo.civ = num("player"); this.diplo.resetDraft(); this.openModal("diplomacy"); break;
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
			case "lens": this.toggleLens(); break;
			case "chat": this.toggleChat(); break;
			case "timer": h.setTurnTimer(num("seconds"), data.player === undefined ? undefined : num("player")); break;
			case "leave": h.leaveGame(); this.closeModal(); break;
			case "endturn": h.endTurn(); break;
			case "nextunit": h.nextUnit(); break;
			case "style": h.toggleStyle(); this.refresh(); break;
			case "save": h.save(); break;
			case "load": h.load(); break;
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
		if (this.modal && this.modal !== "gameover") this.renderModal();
	}

	refreshTopBar (): void {
		const sim = this.sim, p = sim.player(this.me);
		const inc = income(sim, this.me);
		const current = sim.player(sim.current);
		setHtml("civ", `<span class="swatch" style="background:${p.color}"></span>${esc(p.name)}`);
		setHtml("starsBox", `${stars(p.stars)} <span class="${inc.net < 0 ? "bad" : "dim"}">${inc.net >= 0 ? "+" : ""}${inc.net}/turn</span>`);
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
		setHtml("turnBox", `Turn <b>${sim.state.turn}</b>${limit}${clock}`);
		const chat = document.getElementById("btnChat");
		if (chat) {
			chat.classList.toggle("hidden", !this.host.online);
			chat.classList.toggle("on", this.chatOpen);
			setHtml("btnChat", `Chat${this.unread ? ` <span class="badge">${this.unread}</span>` : ""}`);
		}
		const end = document.getElementById("endTurn") as HTMLButtonElement | null;
		if (end) {
			const myTurn = sim.current === this.me && !this.host.busy && !this.host.replaying && !sim.state.winner;
			end.disabled = !myTurn;
			const who = this.host.playerName(sim.current) || current.name.split(" (")[0];
			end.textContent = this.host.replaying ? "Replaying..." : sim.state.winner ? "Game over" : myTurn ? "End Turn" : `${who} is playing...`;
		}
		const pending = sim.state.diplomacy.proposals.filter((pr) => pr.to === this.me).length;
		setHtml("btnDiplo", `Diplomacy${pending ? ` <span class="badge">${pending}</span>` : ""}`);
		const rewards = sim.citiesOf(this.me).filter((c) => c.pendingRewards > 0).length;
		setHtml("btnCities", `Cities${rewards ? ` <span class="badge">${rewards}</span>` : ""}`);
		setHtml("btnAmbition", p.ambition ? `${AMBITIONS[p.ambition].name} <small class="dim">${p.milestones.length}/4</small>` : `Ambition <span class="badge">!</span>`);
		const earned = p.feats.filter((m) => !sim.state.buildings.some((b) => b.type === m && b.owner === this.me)).length;
		setHtml("btnWonders", `Wonders${earned ? ` <span class="badge">${earned}</span>` : ""}`);
		setHtml("styleToggle", `Terrain: ${this.host.terrain.style === "tiles" ? "Tiles" : "Natural"}`);
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
		// The placeholder's shape is named only while the unit is drawn as one
		const models = this.host.models;
		const shape = models?.enabled && models.models.has(u.type) ? "" : info.shape;
		const whose = mine ? "" : esc(owner.name);
		const out = [`<div class="title"><span class="swatch" style="background:${owner.color}"></span>${info.name}${u.veteran ? " &#9733;" : ""} <span class="dim">${[shape, whose].filter(Boolean).join(" &middot; ")}</span></div>`];
		out.push(`<div>Health <b>${u.hp}/${u.maxHp}</b> &middot; Attack ${info.attack} &middot; Defence ${info.defence} &middot; Range ${info.range}${mine ? ` &middot; Moves ${u.moves}/${info.moves}` : ""}</div>`);
		if (!mine) return `<section>${out.join("")}</section>`;
		const buttons: string[] = [];
		const capture = captureProblem(sim, this.me, id);
		const city = sim.cityOn(u.tile);
		if (city && city.owner !== this.me) buttons.push(btn("capture", "Capture", capture));
		if (info.founder) buttons.push(btn("found", "Found city", foundProblem(sim, this.me, u.tile)));
		const enemyRoad = sim.roads[u.tile] >= 0 && sim.roads[u.tile] !== this.me;
		const enemyBuilding = sim.buildingOn(u.tile);
		if (enemyRoad || (enemyBuilding && enemyBuilding.owner !== this.me)) buttons.push(btn("pillage", "Pillage", null));
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
		const out = [`<div class="title">${c.capital ? "&#9733; " : ""}${esc(c.name)} <span class="dim">level ${c.level}${c.walls ? " &middot; walls" : ""}</span></div>`];
		out.push(`<div class="bar" title="Growth: deliver food"><span style="width:${(c.growth / need) * 100}%"></span><em>Growth ${c.growth}/${need}</em></div>`);
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
		const out = [`<div class="sub">${describeTile(sim, tile)}${view === FOGGED ? ` <span class="dim">(out of sight)</span>` : ""} ${coords}</div>`];
		const owner = sim.map.owner[tile];
		if (owner >= 0) out.push(`<div class="dim small">${esc(sim.player(owner).name)} territory${sim.roads[tile] >= 0 ? " &middot; road" : ""}</div>`);
		const b = sim.buildingOn(tile);
		if (b) out.push(this.buildingPanel(b.id));
		if (!compact && owner === this.me && !b && sim.cityAt[tile] < 0) {
			const options = buildOptions(sim, this.me, tile);
			if (options.length) {
				out.push(`<div class="actions build">${options.map(({ type, problem }) => {
					const info = BUILDINGS[type];
					const cost = `&#9733;${info.stars}${Object.keys(info.materials).length ? ` + ${goodsInline(info.materials)}` : ""}`;
					return `<button data-action="build" data-building="${type}" title="${esc(problem ? `${problem}. ${info.description}` : info.description)}" ${problem ? "disabled" : ""}>${info.name} <small>${problem ? esc(problem) : cost}</small></button>`;
				}).join("")}</div>`);
			}
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
		const out = [`<div class="title small">${info.name} <span class="dim">${b.built ? (b.status ? esc(b.status) : info.wonder ? "standing" : "working") : "under construction"}${mine ? "" : ` &middot; ${esc(sim.player(b.owner).name)}`}</span></div>`];
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
			if (outs.length) out.push(`<div class="small">Waiting for carriers: ${goodsList(b.output)}</div>`);
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
				out.push(`<div class="small dim">Buy goods here at twice the market price; carriers take them where they're needed.</div><div class="actions"><select data-buy="good" aria-label="Good to buy">${options}</select>${buy(1)}${buy(5)}</div>`);
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
				return `Attack ${UNIT_TYPES[target.type].name}: deal <b>${r.damage}</b>${r.kills ? " (kills)" : ""}, take <b>${r.retaliation}</b>${r.dies ? " (your unit dies)" : ""}`;
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

	toast (html: string, kind: "info" | "good" | "bad" = "info", seconds = 4): void {
		const box = document.getElementById("toasts");
		if (!box) return;
		const el = document.createElement("div");
		el.className = `toast ${kind}`;
		el.innerHTML = html;
		box.appendChild(el);
		setTimeout(() => el.classList.add("fade"), seconds * 1000);
		setTimeout(() => el.remove(), seconds * 1000 + 600);
		while (box.children.length > 6) box.firstElementChild?.remove();
	}

	/** Turn events into toasts and sounds for the local player. */
	notify (events: SimEvent[]): void {
		const sim = this.sim, me = this.me;
		const name = (p: number) => (p < 0 ? "a village" : esc(sim.player(p).name));
		for (const e of events) {
			switch (e.type) {
				case "report":
					if (e.player === me && e.lines.length) {
						this.toast(`<b>Turn ${sim.state.turn}</b><br>${e.lines.map(esc).join("<br>")}`, "info", 7);
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
				case "cityLevel": {
					const c = sim.city(e.city);
					if (c?.owner === me) {
						this.toast(`<b>${esc(c.name)}</b> reached level ${e.level}: choose a reward`, "good");
						play("level");
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
					}
					break;
				case "met":
					if (e.a === me) this.toast(`You met ${name(e.b)}`, "info");
					break;
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
		if (!buttons.length) return hide();
		// Above the unit, or above the city banner when it stands in a city (the banner's bottom
		// is drawn at the city height + 62 and it is about 24 px tall)
		const p = city
			? h.renderer.worldToScreen(h.viewport, h.world.tileX(city.tile), h.terrain.surface.tileHeight(city.tile) + 62, h.world.tileZ(city.tile))
			: h.renderer.worldToScreen(h.viewport, pos.x, pos.y + BADGE_HEIGHT[u.type], pos.z);
		if (!p || !p.visible) return hide();
		const html = buttons.join("");
		if (el.innerHTML !== html) el.innerHTML = html;
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
			if (el.innerHTML !== html) el.innerHTML = html;
			el.style.transform = `translate(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px) translate(-50%, -100%)`;
			used.add(key);
		};

		for (const c of sim.state.cities) {
			if (!h.terrain.isExplored(c.tile) || (!near && c.owner < 0)) continue;
			const x = world.tileX(c.tile), z = world.tileZ(c.tile);
			const owner = c.owner >= 0 ? sim.player(c.owner) : null;
			// With the lens on, your cities also show what their stores hold
			const store = this.lens && c.owner === this.me ? lensStore(c.store) : "";
			const html = `<span style="border-color:${owner?.color ?? "#888"}">${c.capital ? "&#9733; " : ""}${esc(c.name)} <b>${c.level}</b>${c.owner === this.me && c.pendingRewards ? " &#10022;" : ""}</span>${store}`;
			label(`city${c.id}`, "city-label", html, x, h.terrain.surface.tileHeight(c.tile) + 62, z);
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
				const html = `<span style="--c:${color}">${u.veteran ? "<u>&#9733;</u>" : ""}<i>${UNIT_ICONS[u.type]}</i>${hurt ? `<b>${u.hp}</b>` : ""}</span>${bar}`;
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
			if (d.age > 1.1) {
				d.el.remove();
				this.damage.splice(i, 1);
				continue;
			}
			const p = renderer.worldToScreen(viewport, world.tileX(d.tile), h.terrain.surface.tileHeight(d.tile) + 50 + d.age * 40, world.tileZ(d.tile));
			if (!p || !p.visible) continue;
			d.el.style.opacity = String(1 - d.age / 1.1);
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
		this.renderModal();
	}

	closeModal (): void {
		this.modal = null;
		document.getElementById("modal")?.classList.add("hidden");
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
			case "gameover": body = this.gameOverModal(); break;
		}
		el.innerHTML = `<div class="modal-box ${this.modal}"><button class="close" data-action="close-modal" aria-label="Close">&times;</button>${body}</div>`;
		el.classList.remove("hidden");
	}

	techModal (): string {
		const sim = this.sim, p = sim.player(this.me);
		const cities = sim.citiesOf(this.me).length;
		const tiers = [1, 2, 3, 4].map((tier) => {
			const cards = TECH_IDS.filter((t) => TECHS[t].tier === tier).map((t) => {
				const tech = TECHS[t];
				const have = p.techs.includes(t);
				const ready = tech.requires.every((r) => p.techs.includes(r));
				const cost = researchCost(sim, this.me, t);
				const wonders = WONDER_IDS.filter((w) => BUILDINGS[w].tech === t).map((w) => BUILDINGS[w].name);
				const state = have ? "done" : ready ? (p.stars >= cost ? "ready" : "poor") : "locked";
				const req = tech.requires.length ? `<small>Needs ${tech.requires.map((r) => TECHS[r].name).join(", ")}</small>` : "";
				return `<button class="tech ${state}" data-action="research" data-tech="${t}" ${state === "ready" ? "" : "disabled"}><b>${tech.name}</b><small>${tech.unlocks}${wonders.length ? `; wonder: ${wonders.join(", ")}` : ""}</small>${have ? "<small>Researched</small>" : `<small>&#9733;${cost}</small>`}${have ? "" : req}</button>`;
			});
			return `<div class="tier"><h4>Tier ${tier}</h4>${cards.join("")}</div>`;
		});
		return `<h3>Research <span class="dim">${stars(p.stars)} available &middot; costs rise with your ${cities} cities</span></h3><div class="techs">${tiers.join("")}</div>`;
	}

	economyModal (): string {
		const sim = this.sim, me = this.me, p = sim.player(me);
		const stock = storedGoods(sim, me);
		const hasMarket = sim.buildingsOf(me).some((b) => b.type === "market" && b.built);
		const goods = GOODS.map((g) => {
			const n = stock[g] ?? 0;
			const selling = p.sell.includes(g);
			const sell = sim.hasTech(me, "trade") ? `<button class="mini ${selling ? "on" : ""}" data-action="sell" data-good="${g}" data-on="${selling ? 0 : 1}" title="${hasMarket ? "" : "Build a market to sell goods"}">${selling ? "Selling" : "Keep"}</button>` : "";
			return `<tr><td>${goodChip(g)}</td><td><b>${n}</b></td><td class="dim small">tier ${GOOD_INFO[g].tier}, &#9733;${GOOD_INFO[g].price}</td><td>${sell}</td></tr>`;
		}).join("");
		const order = p.priority.map((k, i) => `<li>${k === "construction" ? "Construction sites" : k === "production" ? "Workshops' inputs" : "Food for cities"} ${i > 0 ? `<button class="mini" data-action="priority" data-kind="${k}">&uarr;</button>` : ""}</li>`).join("");
		const buildings = sim.buildingsOf(me).map((b) =>
			`<tr><td><a href="#" data-action="select-tile" data-tile="${b.tile}">${BUILDINGS[b.type].name}</a></td><td class="small">${b.built ? (b.status ? `<span class="warn">${esc(b.status)}</span>` : `<span class="good">working</span>`) : `building: needs ${goodsInline(b.needs)}`}</td><td class="small">${esc(sim.city(b.city)?.name ?? "")}</td></tr>`
		).join("");
		const inTransit = sim.state.cargo.filter((c) => c.owner === me).length;
		return `<h3>Economy</h3><div class="cols"><div><h4>Stores</h4><table>${goods}</table></div><div><h4>Who gets scarce goods first</h4><ol>${order}</ol><p class="dim small">Carriers move ${carrierSpeed(sim, me)} road tiles per turn; each road tile takes ${roadCapacity(sim, me)} loads per turn. ${inTransit} loads in transit.</p><h4>Buildings <button class="mini ${this.lens ? "on" : ""}" data-action="lens">Show on map (V)</button></h4><table>${buildings || `<tr><td class="dim">None yet: click a tile in your territory.</td></tr>`}</table></div></div>`;
	}

	citiesModal (): string {
		const sim = this.sim, me = this.me;
		const rows = sim.citiesOf(me).map((c) => `<tr><td><a href="#" data-action="select-city" data-city="${c.id}">${c.capital ? "&#9733; " : ""}${esc(c.name)}</a>${c.pendingRewards ? ` <span class="badge">reward</span>` : ""}</td><td>Level ${c.level}</td><td>Growth ${c.growth}/${growthNeeded(c.level)}</td><td>${slotsUsed(sim, c)}/${slotCap(c)} slots</td><td class="small">${goodsList(c.store, "")}</td></tr>`).join("");
		return `<h3>Your cities</h3><table>${rows}</table>`;
	}

	menuModal (): string {
		const h = this.host, sim = this.sim;
		const o = sim.options;
		const toggle = (action: string, on: boolean, label: string) => `<button class="mini ${on ? "on" : ""}" data-action="${action}" data-on="${on ? 0 : 1}">${on ? "On" : "Off"}</button> ${label}`;
		const local = !h.online;
		const invite = h.inviteLink();
		return `<h3>Menu</h3>
			<div class="menu-actions">
				${local ? `<button data-action="save">Save game</button><button data-action="load" ${h.hasSave() ? "" : "disabled"}>Load game</button>` : ""}
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
				<div class="dim small">Founding cities: ${o.allowFounding ? "allowed" : "off"} &middot; Victories: ${Object.entries(o.victories).filter(([, v]) => v).map(([k]) => k).join(", ")} &middot; Difficulty: ${o.difficulty} &middot; Map ${o.width} x ${o.height}, seed "${esc(o.seedText)}"</div>
			</div>
			<h4>Settings</h4>
			<div class="opts">
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
		return `<h3>How to play</h3><div class="help">
			<p><b>Goal</b>: win by Domination (last civ standing), Score (highest after the turn limit), Prosperity (finish the Grand Exchange), Alliance (everyone left is allied) or Diplomacy (win two World Council elections).</p>
			<p><b>Ambition</b> (J): pick a goal to race for. Each milestone pays stars and score, double if you are the first civ to reach it; all four earn a permanent legacy.</p>
			<p><b>Stars</b>: cities earn them each turn. Units beyond your free allowance (3, plus 1 per city) cost upkeep every turn (doubled once you know 12 techs), and cities beyond your tenth cost administration. Hover your stars for the breakdown.</p>
			<p><b>Wonders</b> (M): a world wonder exists once, so civs race to finish it; monuments are earned by feats and raise their city a level.</p>
			<p><b>Expand</b>: capture grey villages with any unit (start a turn on one, press Capture)${this.sim.options.allowFounding ? ", or found cities with settlers" : ""}. Cities earn stars every turn.</p>
			<p><b>Grow</b>: deliver food (fish, game, bread) to cities. Each level adds a building slot and a reward.</p>
			<p><b>Build</b>: click your land to place buildings. Woodcutters are ready at once; other sites wait for logs, planks or stone carried by road, and Rush finishes them for stars. Goods move along roads, ${4} tiles per turn, 2 loads per road tile per turn. Ports (Sailing) let carriers sail between your coastal cities, and a market also sells you goods at twice its price.</p>
			<p><b>Diplomacy</b> (G): treaties, cultural exchanges, research agreements, trades of goods and stars (once, or every turn as a route; where your roads meet theirs the goods travel as carts), demands, denouncing and sanctions. Wars wear both sides down, making peace easier the longer they last. Wars without enough grievances are surprise wars that everyone resents; peace brings a 10-turn truce.</p>
			<p><b>Quick actions</b>: buttons float above a selected unit when it can do something where it stands: crossed swords capture a city, a house founds one, a flame pillages.</p>
			<p><b>Fight</b>: declare war in Diplomacy first. Select a unit to see red attack rings; hover one to preview the damage. Ranged units need line of sight. Units stop when they move next to an enemy.</p>
			<p><b>Keys</b>: WASD/arrows pan, wheel or Z/X zoom, Q/E rotate, Space next unit, Enter end turn, Esc deselect, C centre, T terrain style, R research, G diplomacy, J ambition, M wonders, B economy, V economy lens, L cities, F found city, O menu, H help.</p></div>`;
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
		return `<h3>${title}</h3><p>${names} ${how[w.type]} on turn ${sim.state.turn}.</p><table>${rows}</table><div class="menu-actions"><button class="primary" data-action="newgame">New game</button><button data-action="replay">Watch replay</button><button data-action="close-modal">Keep looking</button></div>`;
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
	return parts.join(" &middot; ");
}

