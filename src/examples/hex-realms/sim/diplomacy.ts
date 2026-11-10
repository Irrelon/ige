import { hasLegacy, hasWonder, voteBonus, wondersOf } from "./effects";
import { networkNodes, search } from "./network";
import { fail, ok } from "./result";
import {
	AGENDA_IDS, type AgendaId, CASUS_BELLI, COUNCIL_BACKING_MOOD, DENOUNCE_COST, END_ALLIANCE_GRIEVANCE, END_TREATY_MOOD, END_TRUCE_TURNS, type EndableTreaty, EXCHANGE_COST, EXCHANGE_TURNS, type Good, GOOD_INFO, GOODS, type Goods,
	researchAgreementCost, RESEARCH_TURNS, ROUTE_TURNS, SANCTION_COST, SANCTION_SHARE, SANCTION_TURNS, type TechId, TECH_IDS, TECHS,
	personalityOf, TRUCE_TURNS, UNIT_TYPES
} from "./rules";
import type { Sim } from "./sim";
import { ALLIANCE, type CommandResult, type DealKind, PEACE, type ProposalState, type TreatyState, type UnitState, WAR } from "./types";
import { mulberry32 } from "../noise";

/**
 * Diplomacy: contact, war / peace / alliance, treaties, deals, star-priced
 * actions, demands, grievances, AI attitudes and agendas, and the World
 * Council.
 *
 * Civs start at peace. Attacking needs a declaration of war. A war is
 * justified when the attacker holds enough grievances against its target;
 * otherwise it is a surprise war that everyone resents. Peace starts a truce
 * during which neither side may declare war. Allies and defensive pact
 * partners are pulled into each other's defensive wars.
 */

export function ix (sim: Sim, a: number, b: number): number {
	return a * sim.playerCount + b;
}

export function attitude (sim: Sim, a: number, b: number): number {
	return sim.state.diplomacy.attitude[ix(sim, a, b)];
}

export function adjustAttitude (sim: Sim, a: number, b: number, delta: number): void {
	const i = ix(sim, a, b);
	const d = sim.state.diplomacy;
	d.attitude[i] = Math.max(-10, Math.min(10, d.attitude[i] + delta));
}

/** a's grievances against b. */
export function grievance (sim: Sim, a: number, b: number): number {
	return sim.state.diplomacy.grievance[ix(sim, a, b)];
}

export function addGrievance (sim: Sim, a: number, b: number, amount: number): void {
	if (a < 0 || b < 0 || a === b) return;
	const d = sim.state.diplomacy;
	d.grievance[ix(sim, a, b)] = Math.max(0, Math.min(20, d.grievance[ix(sim, a, b)] + amount));
}

/** May a declare war on b without being seen as a warmonger? */
export function justified (sim: Sim, a: number, b: number): boolean {
	return grievance(sim, a, b) >= CASUS_BELLI;
}

/** The turn a truce between a and b ends (0 when there is none). */
export function truceUntil (sim: Sim, a: number, b: number): number {
	const until = sim.state.diplomacy.truce[ix(sim, a, b)];
	return until > sim.state.turn ? until : 0;
}

export function hasPact (sim: Sim, a: number, b: number): boolean {
	return sim.state.diplomacy.pact[ix(sim, a, b)] === 1;
}

export function treatyBetween (sim: Sim, kind: TreatyState["kind"], a: number, b: number, directed = false): TreatyState | undefined {
	return sim.state.diplomacy.treaties.find((t) => t.kind === kind && ((t.a === a && t.b === b) || (!directed && t.a === b && t.b === a)));
}

export function setRelation (sim: Sim, a: number, b: number, relation: number): void {
	const d = sim.state.diplomacy;
	d.relation[ix(sim, a, b)] = relation;
	d.relation[ix(sim, b, a)] = relation;
	if (relation === WAR) {
		d.warSince[ix(sim, a, b)] = d.warSince[ix(sim, b, a)] = sim.state.turn;
		for (const [x, y] of [[a, b], [b, a]]) {
			d.openBorders[ix(sim, x, y)] = 0;
			d.trade[ix(sim, x, y)] = 0;
			d.pact[ix(sim, x, y)] = 0;
		}
		d.treaties = d.treaties.filter((t) => t.kind === "sanction" || !((t.a === a && t.b === b) || (t.a === b && t.b === a)));
		d.proposals = d.proposals.filter((p) => !((p.from === a && p.to === b) || (p.from === b && p.to === a)));
		sim.player(a).lastWar = sim.state.turn;
		sim.player(b).lastWar = sim.state.turn;
	}
	sim.emit({ type: "relation", a, b, relation });
	sim.markFog(a);
	sim.markFog(b);
}

/** Why `player` can't declare war on `target`, or null. */
export function warProblem (sim: Sim, player: number, target: number): string | null {
	const t = sim.state.players[target];
	if (!t || !t.alive || target === player) return "Unknown civ";
	if (!sim.hasMet(player, target)) return "You haven't met them";
	if (sim.relation(player, target) === WAR) return "Already at war";
	const truce = truceUntil(sim, player, target);
	if (truce) return `Truce until turn ${truce}`;
	return null;
}

export function declareWarCommand (sim: Sim, player: number, target: number): CommandResult {
	const problem = warProblem(sim, player, target);
	if (problem) return fail(problem);
	const fair = justified(sim, player, target);
	const betrayal = sim.relation(player, target) === ALLIANCE || hasPact(sim, player, target);
	setRelation(sim, player, target, WAR);
	sim.player(player).stats.warsDeclared++;
	adjustAttitude(sim, target, player, -6);
	addGrievance(sim, target, player, (fair ? 2 : 6) + (betrayal ? 6 : 0));
	for (let q = 0; q < sim.playerCount; q++) {
		if (q === player || q === target || !sim.state.players[q].alive) continue;
		// A surprise war (or a betrayal) is held against the attacker by everyone who knows them
		if (sim.hasMet(q, player)) {
			if (!fair) {
				adjustAttitude(sim, q, player, -2);
				addGrievance(sim, q, player, 1.5);
			}
			if (betrayal) adjustAttitude(sim, q, player, -2);
		}
		// Allies and pact partners of the victim join the war
		const defends = sim.relation(q, target) === ALLIANCE || hasPact(sim, q, target);
		if (defends && sim.relation(q, player) !== WAR && !truceUntil(sim, q, player)) {
			setRelation(sim, q, player, WAR);
			adjustAttitude(sim, q, player, -4);
		}
	}
	return ok();
}

// ------------------------------------------------------------------
// Goods held by a civ (for barter and tribute)
// ------------------------------------------------------------------

/** Everything in a civ's city and warehouse stores. */
export function civStock (sim: Sim, player: number): Goods {
	const totals: Goods = {};
	const add = (goods: Goods) => {
		for (const [g, n] of Object.entries(goods) as [Good, number][]) totals[g] = (totals[g] ?? 0) + n;
	};
	for (const c of sim.citiesOf(player)) add(c.store);
	for (const b of sim.state.buildings) if (b.owner === player && b.type === "warehouse" && b.built) add(b.store);
	return totals;
}

function hasGoods (sim: Sim, player: number, goods: Goods | undefined): boolean {
	if (!goods) return true;
	const stock = civStock(sim, player);
	return (Object.entries(goods) as [Good, number][]).every(([g, n]) => (stock[g] ?? 0) >= n);
}

/** Take goods from a civ's stores (cities first, then warehouses). */
function takeGoods (sim: Sim, player: number, goods: Goods | undefined): void {
	if (!goods) return;
	const stores = [...sim.citiesOf(player).map((c) => c.store), ...sim.state.buildings.filter((b) => b.owner === player && b.type === "warehouse" && b.built).map((b) => b.store)];
	for (const [g, n] of Object.entries(goods) as [Good, number][]) {
		let left = n;
		for (const store of stores) {
			const take = Math.min(left, store[g] ?? 0);
			if (take <= 0) continue;
			store[g]! -= take;
			if (!store[g]) delete store[g];
			left -= take;
			if (!left) break;
		}
	}
}

/** Goods arriving from another civ go to the capital's store. */
function receiveGoods (sim: Sim, player: number, goods: Goods | undefined): void {
	if (!goods) return;
	const cities = sim.citiesOf(player);
	const city = cities.find((c) => c.capital) ?? cities[0];
	if (!city) return;
	for (const [g, n] of Object.entries(goods) as [Good, number][]) city.store[g] = (city.store[g] ?? 0) + n;
	sim.emit({ type: "cityChanged", city: city.id });
}

/**
 * Send goods from one civ to another. Where their road networks meet, the
 * goods are carried as cargo from the nearest of the giver's stores to the
 * receiver's capital along both civs' roads; otherwise a caravan delivers
 * them to the capital at once.
 */
function sendGoods (sim: Sim, from: number, to: number, goods: Goods | undefined): void {
	if (!goods) return;
	const cities = sim.citiesOf(to);
	const dest = cities.find((c) => c.capital) ?? cities[0];
	if (!dest) return;
	const mine = networkNodes(sim, from);
	const theirs = networkNodes(sim, to);
	const both = new Uint8Array(sim.map.count);
	for (let t = 0; t < both.length; t++) both[t] = Math.max(mine[t], theirs[t]);
	const s = search(sim);
	const order = [...s.run(sim, both, dest.tile)];
	const storeAt = (t: number): Goods | null => {
		const city = sim.cityOn(t);
		if (city && city.owner === from) return city.store;
		const b = sim.buildingOn(t);
		return b && b.owner === from && b.type === "warehouse" && b.built ? b.store : null;
	};
	for (const [g, n] of Object.entries(goods) as [Good, number][]) {
		for (let k = 0; k < n; k++) {
			const source = order.find((t) => (storeAt(t)?.[g] ?? 0) > 0);
			if (source === undefined) {
				takeGoods(sim, from, { [g]: 1 });
				receiveGoods(sim, to, { [g]: 1 });
				continue;
			}
			const store = storeAt(source)!;
			store[g]! -= 1;
			if (!store[g]) delete store[g];
			sim.state.cargo.push({ id: sim.nextId(), owner: from, good: g, path: s.pathTo(source).reverse(), at: 0, destKind: "city", dest: dest.id, purpose: "trade", receiver: to });
		}
	}
}

/** Market value of some goods in stars. */
export function goodsValue (goods: Goods | undefined): number {
	let v = 0;
	for (const [g, n] of Object.entries(goods ?? {}) as [Good, number][]) v += GOOD_INFO[g].price * n;
	return v;
}

function isEmpty (goods: Goods | undefined): boolean {
	return !goods || Object.values(goods).every((n) => !n);
}

/** Keep only real goods with whole, positive counts (commands may come from the network). */
export function cleanGoods (goods: unknown): Goods | undefined {
	if (!goods || typeof goods !== "object") return undefined;
	const out: Goods = {};
	for (const g of GOODS) {
		const n = Math.floor(Number((goods as Record<string, unknown>)[g]));
		if (n > 0) out[g] = Math.min(99, n);
	}
	return isEmpty(out) ? undefined : out;
}

// ------------------------------------------------------------------
// Deals
// ------------------------------------------------------------------

export interface DealTerms {
	stars?: number;
	give?: Goods;
	get?: Goods;
	getStars?: number;
	turns?: number;
	city?: number;
}

/** What a civ pays for a research agreement. */
export function agreementCost (sim: Sim, player: number): number {
	return researchAgreementCost(sim.citiesOf(player).length);
}

function recentlyDenounced (sim: Sim, a: number, b: number): boolean {
	const d = sim.state.diplomacy;
	const turn = Math.max(d.denounced[ix(sim, a, b)], d.denounced[ix(sim, b, a)]);
	return turn > 0 && sim.state.turn - turn < 10;
}

/** Why this proposal can't be made, or null. */
export function proposalProblem (sim: Sim, from: number, to: number, kind: DealKind, terms: DealTerms = {}): string | null {
	const target = sim.state.players[to];
	if (!target || !target.alive || to === from) return "Unknown civ";
	if (!sim.hasMet(from, to)) return "You haven't met them";
	const relation = sim.relation(from, to);
	const d = sim.state.diplomacy;
	const me = sim.player(from);
	const atWar = relation === WAR ? "You are at war" : null;
	// Before Diplomacy only war and peace: every other deal needs the tech on both sides
	if (kind !== "peace") {
		if (!sim.hasTech(from, "diplomacy")) return "Needs Diplomacy";
		if (!sim.hasTech(to, "diplomacy")) return "They haven't researched Diplomacy";
	}
	switch (kind) {
		case "peace": return relation === WAR ? null : "You are not at war";
		case "alliance": return relation === PEACE ? null : relation === ALLIANCE ? "Already allied" : "Make peace first";
		case "openBorders":
			if (atWar) return atWar;
			return d.openBorders[ix(sim, from, to)] ? "Borders are already open" : null;
		case "trade":
			if (atWar) return atWar;
			if (!sim.hasTech(from, "trade") || !sim.hasTech(to, "trade")) return "Both civs need Trade";
			return d.trade[ix(sim, from, to)] ? "You already trade" : null;
		case "pact":
			if (relation !== PEACE) return relation === ALLIANCE ? "Allies already defend each other" : "Make peace first";
			return hasPact(sim, from, to) ? "You already have a pact" : null;
		case "gift": return (terms.stars ?? 0) > 0 && me.stars >= (terms.stars ?? 0) ? null : "Not enough stars";
		case "exchange":
			if (atWar) return atWar;
			if (recentlyDenounced(sim, from, to)) return "Too soon after a denouncement";
			if (treatyBetween(sim, "exchange", from, to)) return "An exchange is already running";
			return me.stars >= EXCHANGE_COST ? null : `Needs ${EXCHANGE_COST} stars`;
		case "research":
			if (atWar) return atWar;
			if (recentlyDenounced(sim, from, to)) return "Too soon after a denouncement";
			if (treatyBetween(sim, "research", from, to)) return "An agreement is already running";
			return me.stars >= agreementCost(sim, from) ? null : `Needs ${agreementCost(sim, from)} stars`;
		case "barter": {
			if (atWar) return atWar;
			if (treatyBetween(sim, "sanction", from, to)) return "Sanctions are in force";
			if (isEmpty(terms.give) && isEmpty(terms.get) && !terms.stars && !terms.getStars) return "Offer or ask for something";
			if ((terms.stars ?? 0) < 0 || (terms.getStars ?? 0) < 0) return "Invalid stars";
			if (me.stars < (terms.stars ?? 0)) return "Not enough stars";
			if (!hasGoods(sim, from, terms.give)) return "You don't have those goods";
			if ((terms.turns ?? 0) > 0 && !networksMeet(sim, from, to)) return "Trade routes need your road networks to touch";
			return null;
		}
		case "tribute":
			if (atWar) return atWar;
			if (isEmpty(terms.get) && !terms.getStars) return "Demand something";
			return null;
		case "city": {
			if (atWar) return atWar;
			const city = terms.city !== undefined ? sim.city(terms.city) : undefined;
			if (!city || city.owner !== to) return "Choose one of their cities";
			if (city.capital) return "No civ gives up its capital";
			if (!sim.citiesOf(from).some((c) => sim.distance(c.tile, city.tile) <= 5)) return "Only cities near your own can be demanded";
			return null;
		}
	}
}

export function proposeCommand (sim: Sim, from: number, to: number, kind: DealKind, terms: DealTerms): CommandResult {
	const clean: DealTerms = {
		stars: Math.max(0, Math.floor(Number(terms.stars) || 0)),
		give: cleanGoods(terms.give),
		get: cleanGoods(terms.get),
		getStars: Math.max(0, Math.floor(Number(terms.getStars) || 0)),
		turns: terms.turns ? ROUTE_TURNS : 0,
		city: terms.city
	};
	const problem = proposalProblem(sim, from, to, kind, clean);
	if (problem) return fail(problem);
	const proposal: ProposalState = { id: sim.nextId(), from, to, kind, stars: clean.stars ?? 0, turn: sim.state.turn };
	if (clean.give) proposal.give = clean.give;
	if (clean.get) proposal.get = clean.get;
	if (clean.getStars) proposal.getStars = clean.getStars;
	if (clean.turns) proposal.turns = clean.turns;
	if (clean.city !== undefined) proposal.city = clean.city;
	if (kind === "gift") {
		applyDeal(sim, proposal);
		sim.emit({ type: "proposalResolved", proposal, accepted: true });
		return ok();
	}
	if (!sim.isHuman(to)) {
		const accepted = aiAccepts(sim, to, proposal) && !acceptProblem(sim, proposal);
		resolve(sim, proposal, accepted);
		return ok();
	}
	const d = sim.state.diplomacy;
	d.proposals = d.proposals.filter((p) => !(p.from === from && p.to === to && p.kind === kind));
	d.proposals.push(proposal);
	sim.emit({ type: "proposal", proposal });
	return ok();
}

/** Can the deal still be carried out now (both sides able to pay)? */
function acceptProblem (sim: Sim, proposal: ProposalState): string | null {
	const { from, to, kind } = proposal;
	const problem = proposalProblem(sim, from, to, kind, proposal);
	if (problem) return problem;
	const them = sim.player(to);
	switch (kind) {
		case "research": return them.stars >= agreementCost(sim, to) ? null : `They need ${agreementCost(sim, to)} stars`;
		case "barter":
		case "tribute":
			if (them.stars < (proposal.getStars ?? 0)) return "Not enough stars";
			return hasGoods(sim, to, proposal.get) ? null : "Not enough goods";
	}
	return null;
}

export function respondCommand (sim: Sim, player: number, proposalId: number, accept: boolean): CommandResult {
	const d = sim.state.diplomacy;
	const proposal = d.proposals.find((p) => p.id === proposalId);
	if (!proposal || proposal.to !== player) return fail("No such proposal");
	if (accept) {
		const problem = acceptProblem(sim, proposal);
		if (problem) return fail(problem);
	}
	d.proposals = d.proposals.filter((p) => p !== proposal);
	resolve(sim, proposal, accept);
	return ok();
}

function resolve (sim: Sim, proposal: ProposalState, accepted: boolean): void {
	const { from, to, kind } = proposal;
	if (accepted) {
		applyDeal(sim, proposal);
	} else if (kind === "tribute" || kind === "city") {
		// A refused demand gives the demander grounds for war
		addGrievance(sim, from, to, 3);
	} else if (kind !== "barter" && kind !== "peace") {
		adjustAttitude(sim, from, to, -0.5);
	}
	if (kind === "tribute" || kind === "city") adjustAttitude(sim, to, from, -2);
	sim.emit({ type: "proposalResolved", proposal, accepted });
}

function pay (sim: Sim, from: number, to: number, stars: number, reason: string): void {
	if (stars <= 0) return;
	sim.player(from).stars -= stars;
	sim.player(to).stars += stars;
	sim.emit({ type: "stars", player: from, amount: -stars, reason });
	sim.emit({ type: "stars", player: to, amount: stars, reason });
}

function spend (sim: Sim, player: number, stars: number, reason: string): void {
	sim.player(player).stars -= stars;
	sim.emit({ type: "stars", player, amount: -stars, reason });
}

function applyDeal (sim: Sim, proposal: ProposalState): void {
	const { from, to } = proposal;
	const d = sim.state.diplomacy;
	const turn = sim.state.turn;
	const both = (array: number[], value: number) => {
		array[ix(sim, from, to)] = value;
		array[ix(sim, to, from)] = value;
	};
	switch (proposal.kind) {
		case "peace":
			setRelation(sim, from, to, PEACE);
			both(d.truce, turn + TRUCE_TURNS);
			// Peace settles half of the old scores
			d.grievance[ix(sim, from, to)] /= 2;
			d.grievance[ix(sim, to, from)] /= 2;
			break;
		case "alliance":
			setRelation(sim, from, to, ALLIANCE);
			both(d.pact, 0);
			break;
		case "openBorders":
			both(d.openBorders, 1);
			sim.emit({ type: "relation", a: from, b: to, relation: sim.relation(from, to) });
			break;
		case "trade":
			both(d.trade, 1);
			sim.emit({ type: "relation", a: from, b: to, relation: sim.relation(from, to) });
			break;
		case "pact":
			both(d.pact, 1);
			sim.emit({ type: "relation", a: from, b: to, relation: sim.relation(from, to) });
			break;
		case "gift":
			pay(sim, from, to, proposal.stars, "Gift");
			adjustAttitude(sim, to, from, Math.min(4, proposal.stars / 3));
			break;
		case "exchange":
			spend(sim, from, EXCHANGE_COST, "Cultural exchange");
			d.treaties.push({ kind: "exchange", a: from, b: to, until: turn + EXCHANGE_TURNS });
			break;
		case "research":
			spend(sim, from, agreementCost(sim, from), "Research agreement");
			spend(sim, to, agreementCost(sim, to), "Research agreement");
			d.treaties.push({ kind: "research", a: from, b: to, until: turn + RESEARCH_TURNS });
			break;
		case "barter":
			if (proposal.turns) {
				d.treaties.push({ kind: "route", a: from, b: to, until: turn + proposal.turns, give: proposal.give, stars: proposal.stars, get: proposal.get, getStars: proposal.getStars });
			} else {
				swap(sim, from, to, proposal.give, proposal.stars, proposal.get, proposal.getStars ?? 0);
			}
			break;
		case "tribute":
			sendGoods(sim, to, from, proposal.get);
			pay(sim, to, from, proposal.getStars ?? 0, "Tribute");
			break;
		case "city": {
			const city = proposal.city !== undefined ? sim.city(proposal.city) : undefined;
			if (city && city.owner === to) sim.transferCity(city, from);
			break;
		}
	}
	if (proposal.kind !== "gift" && proposal.kind !== "tribute" && proposal.kind !== "city") {
		adjustAttitude(sim, from, to, 1);
		adjustAttitude(sim, to, from, 1);
	}
}

/** a sends b `give` and `stars`; b sends a `get` and `getStars`. */
function swap (sim: Sim, a: number, b: number, give: Goods | undefined, stars: number, get: Goods | undefined, getStars: number): void {
	sendGoods(sim, a, b, give);
	sendGoods(sim, b, a, get);
	pay(sim, a, b, stars, "Trade");
	pay(sim, b, a, getStars, "Trade");
}

// ------------------------------------------------------------------
// Star-priced actions against a civ
// ------------------------------------------------------------------

export function actionProblem (sim: Sim, from: number, to: number, kind: "denounce" | "sanction"): string | null {
	const target = sim.state.players[to];
	if (!target || !target.alive || to === from) return "Unknown civ";
	if (!sim.hasMet(from, to)) return "You haven't met them";
	if (!sim.hasTech(from, "diplomacy")) return "Needs Diplomacy";
	const me = sim.player(from);
	if (kind === "denounce") {
		const last = sim.state.diplomacy.denounced[ix(sim, from, to)];
		if (last > 0 && sim.state.turn - last < 10) return "You denounced them recently";
		return me.stars >= DENOUNCE_COST ? null : `Needs ${DENOUNCE_COST} stars`;
	}
	if (treatyBetween(sim, "sanction", from, to, true)) return "Sanctions are already in force";
	return me.stars >= SANCTION_COST ? null : `Needs ${SANCTION_COST} stars`;
}

/**
 * Denounce a civ: it resents you, civs that dislike it think better of you
 * (and its friends worse), and its standing drops a little everywhere.
 */
export function denounceCommand (sim: Sim, from: number, to: number): CommandResult {
	const problem = actionProblem(sim, from, to, "denounce");
	if (problem) return fail(problem);
	const d = sim.state.diplomacy;
	spend(sim, from, DENOUNCE_COST, "Denouncement");
	d.denounced[ix(sim, from, to)] = sim.state.turn;
	adjustAttitude(sim, to, from, -4);
	addGrievance(sim, to, from, 2);
	for (let q = 0; q < sim.playerCount; q++) {
		if (q === from || q === to || !sim.state.players[q].alive || !sim.hasMet(q, from) || !sim.hasMet(q, to)) continue;
		const feel = attitude(sim, q, to);
		if (feel <= -2) adjustAttitude(sim, q, from, 1);
		else if (feel >= 3) adjustAttitude(sim, q, from, -1);
		adjustAttitude(sim, q, to, -0.5);
	}
	d.treaties = d.treaties.filter((t) => !((t.kind === "exchange" || t.kind === "research") && ((t.a === from && t.b === to) || (t.a === to && t.b === from))));
	sim.emit({ type: "diplomacyAction", kind: "denounce", from, to });
	return ok();
}

/** Why `from` can't end this agreement with `to` early, or null. */
export function endTreatyProblem (sim: Sim, from: number, to: number, kind: EndableTreaty): string | null {
	const target = sim.state.players[to];
	if (!target || !target.alive || to === from) return "Unknown civ";
	const d = sim.state.diplomacy;
	switch (kind) {
		case "openBorders": return d.openBorders[ix(sim, from, to)] ? null : "Borders aren't open";
		case "trade": return d.trade[ix(sim, from, to)] ? null : "No trade agreement";
		case "route": return treatyBetween(sim, "route", from, to) ? null : "No trade routes";
		case "pact": return hasPact(sim, from, to) ? null : "No defensive pact";
		case "alliance": return sim.relation(from, to) === ALLIANCE ? null : "Not allied";
	}
}

/**
 * End an agreement early. It's within a civ's rights, so it costs nothing,
 * but the other civ resents it: a snub for open borders, trade agreements
 * and trade routes, worse for a pact, and an alliance also leaves a
 * grievance. Ending a pact or an alliance starts a short truce, so neither
 * can be dropped just before an attack to dodge the betrayal penalty.
 * Where the other civ's land closes to the ender's units (open borders, or
 * an alliance without them), those units are lost, as when breaking a
 * treaty in Polytopia; the other civ's units already in the ender's land
 * stay and may go on moving about inside it, but no more may come in.
 */
export function endTreatyCommand (sim: Sim, from: number, to: number, kind: EndableTreaty): CommandResult {
	const problem = endTreatyProblem(sim, from, to, kind);
	if (problem) return fail(problem);
	const d = sim.state.diplomacy;
	const lost = strandedUnits(sim, from, to, kind);
	const both = (array: number[], value: number) => {
		array[ix(sim, from, to)] = value;
		array[ix(sim, to, from)] = value;
	};
	const truce = () => both(d.truce, Math.max(d.truce[ix(sim, from, to)], sim.state.turn + END_TRUCE_TURNS));
	switch (kind) {
		case "openBorders": both(d.openBorders, 0); break;
		case "trade": both(d.trade, 0); break;
		case "route": d.treaties = d.treaties.filter((t) => !(t.kind === "route" && ((t.a === from && t.b === to) || (t.a === to && t.b === from)))); break;
		case "pact": both(d.pact, 0); truce(); break;
		case "alliance":
			setRelation(sim, from, to, PEACE);
			truce();
			addGrievance(sim, to, from, END_ALLIANCE_GRIEVANCE);
			break;
	}
	adjustAttitude(sim, to, from, -END_TREATY_MOOD[kind]);
	for (const unit of lost) sim.removeUnit(unit, "killed");
	sim.emit({ type: "treatyEnded", kind, from, to, lost: lost.length });
	sim.emit({ type: "relation", a: from, b: to, relation: sim.relation(from, to) });
	return ok();
}

/** `from`'s units in `to`'s land that would be lost if `from` ended this agreement (only open borders and alliances let units in). */
export function strandedUnits (sim: Sim, from: number, to: number, kind: EndableTreaty = "openBorders"): UnitState[] {
	if (kind !== "openBorders" && kind !== "alliance") return [];
	if (sim.atWar(from, to)) return [];
	// Still let in by the other agreement?
	if (kind === "openBorders" ? sim.allied(from, to) : sim.state.diplomacy.openBorders[ix(sim, from, to)]) return [];
	return sim.unitsOf(from).filter((u) => sim.map.owner[u.tile] === to);
}

/** Sanction a civ: its star income drops for a while and trade with you stops. */
export function sanctionCommand (sim: Sim, from: number, to: number): CommandResult {
	const problem = actionProblem(sim, from, to, "sanction");
	if (problem) return fail(problem);
	const d = sim.state.diplomacy;
	spend(sim, from, SANCTION_COST, "Sanctions");
	d.treaties = d.treaties.filter((t) => !(t.kind === "route" && ((t.a === from && t.b === to) || (t.a === to && t.b === from))));
	d.treaties.push({ kind: "sanction", a: from, b: to, until: sim.state.turn + SANCTION_TURNS });
	d.trade[ix(sim, from, to)] = d.trade[ix(sim, to, from)] = 0;
	adjustAttitude(sim, to, from, -3);
	addGrievance(sim, to, from, 2);
	sim.emit({ type: "diplomacyAction", kind: "sanction", from, to });
	sim.emit({ type: "relation", a: from, b: to, relation: sim.relation(from, to) });
	return ok();
}

/** Stars a civ loses to sanctions against it this turn. */
export function sanctionLoss (sim: Sim, player: number, gross: number): number {
	let loss = 0;
	for (const t of sim.state.diplomacy.treaties) {
		if (t.kind === "sanction" && t.b === player && t.until > sim.state.turn) loss += Math.max(1, Math.round(gross * SANCTION_SHARE));
	}
	return Math.min(Math.max(0, gross), loss);
}

// ------------------------------------------------------------------
// Strength, AI acceptance and attitudes
// ------------------------------------------------------------------

/** Military strength: the fighting value of a civ's units. */
export function strength (sim: Sim, player: number): number {
	let s = 0;
	for (const u of sim.unitsOf(player)) {
		const t = UNIT_TYPES[u.type];
		s += (t.attack + t.defence) * (u.hp / u.maxHp);
	}
	return s + sim.citiesOf(player).length * 2;
}

/**
 * What a deal is worth to an AI civ receiving it: what it gets less what it
 * gives, with goods it is short of worth more and surplus worth less.
 */
export function dealGain (sim: Sim, ai: number, proposal: ProposalState): number {
	const stock = civStock(sim, ai);
	const value = (goods: Goods | undefined, receiving: boolean) => {
		let v = 0;
		for (const [g, n] of Object.entries(goods ?? {}) as [Good, number][]) {
			const have = stock[g] ?? 0;
			const factor = receiving ? (have < 3 ? 1.4 : have > 15 ? 0.6 : 1) : (have > 15 ? 0.6 : have < 4 ? 1.5 : 1);
			v += GOOD_INFO[g].price * n * factor;
		}
		return v;
	};
	const gets = value(proposal.give, true) + proposal.stars;
	const gives = value(proposal.get, false) + (proposal.getStars ?? 0);
	return gets - gives * 1.1;
}

/** War weariness: grows by 1 every 4 turns of a war (up to 6), making both sides readier for peace. */
export function weariness (sim: Sim, a: number, b: number): number {
	if (sim.relation(a, b) !== WAR) return 0;
	return Math.min(6, Math.max(0, sim.state.turn - sim.state.diplomacy.warSince[ix(sim, a, b)]) / 4);
}

/** Whether an AI civ accepts a proposal. */
export function aiAccepts (sim: Sim, ai: number, proposal: ProposalState): boolean {
	const from = proposal.from;
	// Agreeable leaders meet you halfway; warlike ones need more persuading
	const feel = attitude(sim, ai, from) + personalityOf(sim.player(ai).agenda).agreeable;
	const grudge = grievance(sim, ai, from);
	const ratio = strength(sim, from) / Math.max(1, strength(sim, ai));
	switch (proposal.kind) {
		case "peace": return feel - grudge * 0.2 + weariness(sim, ai, from) + (ratio > 1.2 ? 3 : 0) - (ratio < 0.6 ? 3 : 0) >= -2;
		case "alliance": return feel >= 5 && grudge < 2;
		case "openBorders": return feel >= 1;
		case "trade": return feel >= 1;
		case "pact": return feel >= 3 && grudge < 2;
		case "gift": return true;
		case "exchange": return feel >= 0;
		case "research": return feel >= 1 && sim.player(ai).stars >= agreementCost(sim, ai) + 5;
		case "barter": return feel >= -2 && dealGain(sim, ai, proposal) >= 0;
		case "tribute": {
			const asked = (proposal.getStars ?? 0) + goodsValue(proposal.get);
			return ratio >= 1.8 && feel > -7 && asked <= Math.max(5, sim.player(ai).stars * 0.4);
		}
		case "city": return ratio >= 3 && feel > -5;
	}
}

/** Do two civs' road networks touch (for trade routes and trade income)? */
export function networksMeet (sim: Sim, a: number, b: number): boolean {
	const na = networkNodes(sim, a);
	const nb = networkNodes(sim, b);
	for (let t = 0; t < sim.map.count; t++) {
		if (!na[t]) continue;
		for (const n of sim.neighbors(t)) if (nb[n]) return true;
	}
	return false;
}

/** Stars from trade agreements (more when road networks meet) and cultural exchanges this turn. */
export function diplomacyIncome (sim: Sim, player: number): number {
	const d = sim.state.diplomacy;
	let stars = 0;
	const bazaar = hasWonder(sim, player, "grandBazaar") ? 1 : 0;
	for (let q = 0; q < sim.playerCount; q++) {
		if (q === player || !d.trade[ix(sim, player, q)] || !sim.state.players[q].alive) continue;
		stars += (networksMeet(sim, player, q) ? 2 : 1) + bazaar;
	}
	for (const t of d.treaties) {
		if (t.kind === "exchange" && (t.a === player || t.b === player) && t.until > sim.state.turn) stars += 1;
	}
	return stars;
}

function bordersTouch (sim: Sim, a: number, b: number): boolean {
	const owner = sim.map.owner;
	for (let t = 0; t < sim.map.count; t++) {
		if (owner[t] !== a) continue;
		for (const n of sim.neighbors(t)) if (owner[n] === b) return true;
	}
	return false;
}

/** Pairs of a's and b's cities within 6 tiles of each other. */
function crowding (sim: Sim, a: number, b: number): number {
	let pairs = 0;
	const theirs = sim.citiesOf(b);
	for (const mine of sim.citiesOf(a)) {
		for (const other of theirs) if (sim.distance(mine.tile, other.tile) <= 6) pairs++;
	}
	return pairs;
}

export interface AttitudeFactor {
	label: string;
	delta: number;
}

/** Why a feels the way it does about b: each factor moves a's attitude every round. */
export function attitudeFactors (sim: Sim, a: number, b: number, touching?: boolean): AttitudeFactor[] {
	const d = sim.state.diplomacy;
	const out: AttitudeFactor[] = [];
	const add = (label: string, delta: number) => {
		if (delta) out.push({ label, delta });
	};
	const relation = sim.relation(a, b);
	if (relation === WAR) add("At war", -0.3);
	if (relation === ALLIANCE) add("Allies", 0.3);
	if (hasPact(sim, a, b)) add("Defensive pact", 0.2);
	const trades = d.trade[ix(sim, a, b)] === 1;
	if (trades) add("Trade agreement", 0.3);
	if (treatyBetween(sim, "exchange", a, b)) add("Cultural exchange", 0.5);
	if (treatyBetween(sim, "route", a, b)) add("Trade route", 0.2);
	if ((touching ?? bordersTouch(sim, a, b)) && !trades && relation !== ALLIANCE) add("Shared border", -0.25);
	if (relation !== ALLIANCE) add("Cities close to ours", -Math.min(0.6, 0.15 * crowding(sim, a, b)));
	let common = 0;
	for (let c = 0; c < sim.playerCount; c++) if (c !== a && c !== b && sim.atWar(a, c) && sim.atWar(b, c)) common += 0.2;
	add("Common enemy", common);
	add("Grievances", -Math.min(0.6, 0.06 * grievance(sim, a, b)));
	if (treatyBetween(sim, "sanction", b, a, true)) add("Sanctions us", -0.3);
	const denounced = d.denounced[ix(sim, b, a)];
	if (denounced > 0 && sim.state.turn - denounced < 10) add("Denounced us", -0.3);
	if (hasWonder(sim, b, "councilHall")) add("Council Hall", 0.3);
	if (hasLegacy(sim, b, "diplomacy")) add("Peacemakers", 0.3);
	const agenda = sim.player(a).human ? null : sim.player(a).agenda;
	if (agenda) {
		const cities = (p: number) => sim.citiesOf(p).length;
		switch (agenda) {
			case "expansionist":
				if (cities(b) > cities(a)) add("More cities than us (Expansionist)", -0.25);
				else if (cities(b) < cities(a)) add("Smaller than us (Expansionist)", 0.1);
				break;
			case "merchant":
				if (trades || treatyBetween(sim, "route", a, b)) add("Trades with us (Merchant)", 0.3);
				if (d.treaties.some((t) => t.kind === "sanction" && t.a === b)) add("Imposes sanctions (Merchant)", -0.2);
				break;
			case "militarist": {
				const ours = strength(sim, a), theirs = strength(sim, b);
				if (theirs >= ours) add("Strong army (Militarist)", 0.2);
				else if (theirs < ours * 0.5) add("Weak army (Militarist)", -0.2);
				break;
			}
			case "builder": {
				const w = (p: number) => {
					const x = wondersOf(sim, p);
					return x.world + x.monuments;
				};
				if (w(b) > w(a)) add("More wonders than us (Builder)", -0.3);
				break;
			}
			case "peacemaker": {
				const warring = sim.player(b).stats.warsDeclared > 0 && sim.state.players.some((q) => q.alive && q.index !== b && sim.atWar(b, q.index));
				add(warring ? "Wages war (Peacemaker)" : "Peaceful (Peacemaker)", warring ? -0.3 : 0.1);
				break;
			}
			case "scholar":
				if (treatyBetween(sim, "research", a, b)) add("Research partner (Scholar)", 0.4);
				if (sim.player(b).techs.length > sim.player(a).techs.length + 2) add("Ahead in technology (Scholar)", -0.2);
				break;
		}
	}
	return out;
}

/** An AI leader's agenda, fixed for the game (from the seed, without touching the game's random numbers). */
export function pickAgenda (seed: number, player: number): AgendaId {
	const r = mulberry32((seed ^ Math.imul(player + 7, 0x2c1b3c6d)) >>> 0)();
	return AGENDA_IDS[Math.floor(r * AGENDA_IDS.length)];
}

// ------------------------------------------------------------------
// Once a round
// ------------------------------------------------------------------

/** Once per round: attitudes drift, grievances fade, treaties run and expire, the council votes. */
export function roundUpdate (sim: Sim): void {
	const d = sim.state.diplomacy;
	const n = sim.playerCount;
	const turn = sim.state.turn;
	const touching = new Set<number>();
	const owner = sim.map.owner;
	for (let t = 0; t < sim.map.count; t++) {
		const a = owner[t];
		if (a < 0) continue;
		for (const nb of sim.neighbors(t)) {
			const b = owner[nb];
			if (b >= 0 && b !== a) touching.add(a * n + b);
		}
	}

	for (let a = 0; a < n; a++) {
		const pa = sim.state.players[a];
		if (!pa.alive) continue;
		if (sim.state.players.some((q) => q.alive && q.index !== a && sim.atWar(a, q.index))) pa.lastWar = turn;
		for (let b = 0; b < n; b++) {
			if (a === b || !sim.state.players[b].alive) continue;
			// Grievances fade slowly
			if (d.grievance[ix(sim, a, b)] > 0) d.grievance[ix(sim, a, b)] = Math.max(0, d.grievance[ix(sim, a, b)] - 0.15);
			if (!sim.hasMet(a, b)) continue;
			let delta = 0;
			for (const f of attitudeFactors(sim, a, b, touching.has(a * n + b))) delta += f.delta;
			// Feelings fade toward neutral over time
			delta -= attitude(sim, a, b) * 0.02;
			adjustAttitude(sim, a, b, delta);
		}
	}

	d.proposals = d.proposals.filter((p) => turn - p.turn <= 3);
	runTreaties(sim);

	if (d.council.formed && turn >= d.council.nextVote) councilVote(sim);
}

/** Trade routes deliver; research agreements pay out; expired treaties end. */
function runTreaties (sim: Sim): void {
	const d = sim.state.diplomacy;
	const turn = sim.state.turn;
	for (const t of d.treaties) {
		if (t.kind === "route" && t.until >= turn) {
			const able = sim.state.players[t.a].alive && sim.state.players[t.b].alive && networksMeet(sim, t.a, t.b)
				&& hasGoods(sim, t.a, t.give) && hasGoods(sim, t.b, t.get)
				&& sim.player(t.a).stars >= (t.stars ?? 0) && sim.player(t.b).stars >= (t.getStars ?? 0);
			if (able) swap(sim, t.a, t.b, t.give, t.stars ?? 0, t.get, t.getStars ?? 0);
		}
		if (t.kind === "research" && t.until <= turn) {
			freeTech(sim, t.a);
			freeTech(sim, t.b);
		}
	}
	d.treaties = d.treaties.filter((t) => t.until > turn);
}

/** The cheapest technology a civ can research next, given for free. */
function freeTech (sim: Sim, player: number): void {
	const p = sim.player(player);
	if (!p.alive) return;
	const options = TECH_IDS.filter((t) => !p.techs.includes(t) && TECHS[t].requires.every((r) => p.techs.includes(r)));
	options.sort((x, y) => TECHS[x].tier - TECHS[y].tier || TECH_IDS.indexOf(x) - TECH_IDS.indexOf(y));
	const tech: TechId | undefined = options[0];
	if (!tech) return;
	p.techs.push(tech);
	sim.emit({ type: "tech", player, tech });
	if (tech === "statecraft") formCouncil(sim);
}

/** Taking a village next to another civ's cities sours relations with them. */
export function villageTaken (sim: Sim, taker: number, tile: number): void {
	for (const q of sim.state.players) {
		if (q.index === taker || !q.alive) continue;
		if (sim.citiesOf(q.index).some((c) => sim.distance(c.tile, tile) <= 5)) {
			adjustAttitude(sim, q.index, taker, -1.5);
			addGrievance(sim, q.index, taker, 1);
		}
	}
}

/** A civ lost a city to another. */
export function cityConquered (sim: Sim, from: number, to: number): void {
	addGrievance(sim, from, to, 3);
}

export function formCouncil (sim: Sim): void {
	const council = sim.state.diplomacy.council;
	if (council.formed || !sim.options.victories.diplomatic) return;
	council.formed = true;
	council.nextVote = sim.state.turn + 3;
}

/** Votes a civ brings to the council. */
export function votesOf (sim: Sim, player: number): number {
	const cities = sim.citiesOf(player);
	return cities.length + Math.floor(cities.reduce((s, c) => s + c.level, 0) / 2) + voteBonus(sim, player);
}

/**
 * The World Council elects a leader every 5 turns. Each civ votes for
 * itself unless it likes or is allied to a stronger candidate. A leader
 * needs a majority of the votes and the backing of at least half of the
 * other civs (size alone doesn't win elections). Being elected twice in a
 * row is a diplomatic victory.
 */
export function councilVote (sim: Sim): void {
	const council = sim.state.diplomacy.council;
	const n = sim.playerCount;
	const tally = new Array(n).fill(0);
	const own = new Array(n).fill(0);
	const backers = new Array(n).fill(0);
	for (let p = 0; p < n; p++) if (sim.state.players[p].alive) own[p] = votesOf(sim, p);

	for (let p = 0; p < n; p++) {
		if (!sim.state.players[p].alive) continue;
		let choice = p;
		if (!sim.isHuman(p)) {
			let best = own[p];
			for (let c = 0; c < n; c++) {
				if (c === p || !sim.state.players[c].alive) continue;
				const friend = sim.allied(p, c) || attitude(sim, p, c) >= COUNCIL_BACKING_MOOD;
				if (friend && own[c] > best) {
					best = own[c];
					choice = c;
				}
			}
		}
		tally[choice] += own[p];
		if (choice !== p) backers[choice]++;
	}

	const alive = sim.state.players.filter((pl) => pl.alive).length;
	const backingNeeded = Math.ceil((alive - 1) / 2);
	const totalVotes = tally.reduce((s, v) => s + v, 0);
	let winner = -1;
	for (let p = 0; p < n; p++) if (tally[p] * 2 > totalVotes && backers[p] >= backingNeeded) winner = p;
	council.streak = winner >= 0 && winner === council.lastWinner ? council.streak + 1 : winner >= 0 ? 1 : 0;
	council.lastWinner = winner;
	council.lastVotes = tally;
	council.nextVote = sim.state.turn + 5;
	sim.emit({ type: "council", votes: tally, winner });
}
