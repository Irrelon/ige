import {
	actionProblem, agreementCost, aiAccepts, attitude, attitudeFactors, cleanGoods, type DealTerms, grievance, hasPact, justified,
	proposalProblem, truceUntil, votesOf, warProblem
} from "../sim/diplomacy";
import {
	AGENDAS, AMBITIONS, CASUS_BELLI, CIVS, DENOUNCE_COST, EXCHANGE_COST, EXCHANGE_TURNS, GOODS, type Good, type Goods,
	RESEARCH_TURNS, ROUTE_TURNS, SANCTION_COST, SANCTION_TURNS, TRUCE_TURNS
} from "../sim/rules";
import { civStock } from "../sim/diplomacy";
import type { Sim } from "../sim/sim";
import { ALLIANCE, type Command, type DealKind, type ProposalState, type TreatyState, WAR } from "../sim/types";
import { actionButton, esc, goodChip, goodsInline, stars, swatch } from "./html";

/**
 * The diplomacy screen: a list of known civs and, for the one selected, its
 * relations, mood (and why), agenda, grievances and treaties, with every
 * action that can be taken towards it, and a deal editor for trading goods
 * and stars.
 */

interface DealDraft {
	give: Goods;
	get: Goods;
	stars: number;
	getStars: number;
	route: boolean;
	city: number;
}

const emptyDraft = (): DealDraft => ({ give: {}, get: {}, stars: 0, getStars: 0, route: false, city: -1 });

export function dealName (kind: DealKind): string {
	return {
		peace: "peace", alliance: "an alliance", openBorders: "open borders", trade: "a trade agreement", gift: "a gift", pact: "a defensive pact",
		exchange: "a cultural exchange", research: "a research agreement", barter: "a trade", tribute: "tribute", city: "a city"
	}[kind];
}

function terms (give?: Goods, giveStars = 0, get?: Goods, getStars = 0): [string, string] {
	const side = (goods: Goods | undefined, n: number) => [n ? `&#9733;${n}` : "", goods ? goodsInline(goods) : ""].filter((s) => s && s !== "nothing").join(" + ") || "nothing";
	return [side(give, giveStars), side(get, getStars)];
}

/** One line describing a proposal, from the point of view of its recipient. */
export function describeProposal (sim: Sim, pr: ProposalState): string {
	const who = esc(sim.player(pr.from).name);
	switch (pr.kind) {
		case "barter": {
			const [offer, ask] = terms(pr.give, pr.stars, pr.get, pr.getStars ?? 0);
			return `${who} offers <b>${offer}</b> for <b>${ask}</b>${pr.turns ? ` every turn for ${pr.turns} turns` : ""}`;
		}
		case "tribute": return `${who} <b class="bad">demands</b> ${terms(undefined, 0, pr.get, pr.getStars ?? 0)[1]} in tribute (refusing gives them grounds for war)`;
		case "city": return `${who} <b class="bad">demands</b> the city of ${esc(sim.city(pr.city ?? -1)?.name ?? "?")}`;
		case "research": return `${who} proposes a research agreement (each pays &#9733;${agreementCost(sim, pr.to)}; both get a free technology in ${RESEARCH_TURNS} turns)`;
		case "exchange": return `${who} proposes a cultural exchange (they pay; both gain a star a turn for ${EXCHANGE_TURNS} turns)`;
		default: return `${who} proposes <b>${dealName(pr.kind)}</b>`;
	}
}

function treatyLine (sim: Sim, me: number, t: TreatyState): string {
	const left = `${t.until - sim.state.turn} turns left`;
	switch (t.kind) {
		case "exchange": return `Cultural exchange (${left})`;
		case "research": return `Research agreement (${left})`;
		case "sanction": return t.a === me ? `<span class="warn">Your sanctions on them</span> (${left})` : `<span class="bad">Their sanctions on you</span> (${left})`;
		case "route": {
			const mine = t.a === me;
			const [a, b] = terms(t.give, t.stars ?? 0, t.get, t.getStars ?? 0);
			return `Trade route: ${mine ? "you send" : "they send"} ${a}, ${mine ? "they send" : "you send"} ${b} each turn (${left})`;
		}
	}
}

export class DiplomacyScreen {
	civ = -1;
	draft: DealDraft = emptyDraft();

	/** Read a deal editor field. */
	input (field: string, value: string, checked: boolean): void {
		const n = Math.max(0, Math.floor(Number(value) || 0));
		if (field === "stars") this.draft.stars = n;
		else if (field === "getStars") this.draft.getStars = n;
		else if (field === "route") this.draft.route = checked;
		else if (field === "city") this.draft.city = Number(value);
		else {
			const [side, good] = field.split(":") as ["give" | "get", Good];
			if (n > 0) this.draft[side][good] = n;
			else delete this.draft[side][good];
		}
	}

	dealTerms (): DealTerms {
		return {
			stars: this.draft.stars,
			getStars: this.draft.getStars,
			give: cleanGoods(this.draft.give),
			get: cleanGoods(this.draft.get),
			turns: this.draft.route ? ROUTE_TURNS : 0
		};
	}

	/** The command for a deal-editor or demand button. */
	command (action: string, data: DOMStringMap): Command | null {
		const to = Number(data.player);
		switch (action) {
			case "propose-deal": return { type: "propose", to, kind: "barter", ...this.dealTerms() };
			case "demand-tribute": return { type: "propose", to, kind: "tribute", getStars: Number(data.stars) };
			case "demand-city": return this.draft.city >= 0 ? { type: "propose", to, kind: "city", city: this.draft.city } : null;
			case "denounce": return { type: "denounce", target: to };
			case "sanction": return { type: "sanction", target: to };
		}
		return null;
	}

	resetDraft (): void {
		this.draft = emptyDraft();
	}

	/** A hint for the deal being edited: whether it can be proposed, and how an AI is likely to answer. */
	hint (sim: Sim, me: number): string {
		const o = this.civ;
		if (o < 0) return "";
		const t = this.dealTerms();
		const problem = proposalProblem(sim, me, o, "barter", t);
		if (problem) return `<span class="dim">${esc(problem)}</span>`;
		if (sim.isHuman(o)) return `<span class="dim">They will be asked</span>`;
		const preview: ProposalState = { id: -1, from: me, to: o, kind: "barter", stars: t.stars ?? 0, turn: sim.state.turn, give: t.give, get: t.get, getStars: t.getStars, turns: t.turns };
		const stock = civStock(sim, o);
		const short = Object.entries(t.get ?? {}).some(([g, n]) => (stock[g as Good] ?? 0) < (n ?? 0));
		if (short || (t.getStars ?? 0) > sim.player(o).stars) return `<span class="warn">They don't have that much</span>`;
		return aiAccepts(sim, o, preview) ? `<span class="good">They would likely accept</span>` : `<span class="bad">They would likely refuse</span>`;
	}

	/** Who plays each civ online ("" for none). */
	playerName: (p: number) => string = () => "";

	render (sim: Sim, me: number, playerName?: (p: number) => string): string {
		if (playerName) this.playerName = playerName;
		const d = sim.state.diplomacy;
		const others = sim.state.players.filter((q) => q.index !== me);
		if (this.civ < 0 || this.civ === me || !sim.state.players[this.civ]?.alive || !sim.hasMet(me, this.civ)) {
			this.civ = others.find((q) => q.alive && sim.hasMet(me, q.index))?.index ?? -1;
		}
		const incoming = d.proposals.filter((pr) => pr.to === me).map((pr) =>
			`<div class="proposal"><span>${describeProposal(sim, pr)}</span> <button class="primary" data-action="respond" data-proposal="${pr.id}" data-accept="1">Accept</button><button data-action="respond" data-proposal="${pr.id}" data-accept="0">Decline</button></div>`
		).join("");

		const list = others.map((q) => {
			const o = q.index;
			if (!q.alive) return `<button class="civ dead" disabled>${swatch(q.color)}${esc(q.name)}<small>Destroyed</small></button>`;
			if (!sim.hasMet(me, o)) return `<button class="civ" disabled>${swatch(q.color)}<span class="dim">Unknown civilisation</span><small>Not met yet</small></button>`;
			const rel = sim.relation(me, o);
			const tag = rel === WAR ? `<span class="bad">War</span>` : rel === ALLIANCE ? `<span class="good">Alliance</span>` : "Peace";
			const pending = d.proposals.some((pr) => pr.to === me && pr.from === o) ? ` <span class="badge">!</span>` : "";
			const person = this.playerName(o);
			return `<button class="civ ${o === this.civ ? "on" : ""}" data-action="diplo-civ" data-player="${o}">${swatch(q.color)}${esc(q.name)}${person ? ` <b>${esc(person)}</b>` : ""}${pending}<small>${tag} &middot; ${mood(sim, o, me)}</small></button>`;
		}).join("");

		const council = d.council;
		const councilText = !sim.options.victories.diplomatic ? "Diplomatic victory is off." : council.formed
			? `The World Council votes on turn ${council.nextVote}. ${council.lastWinner >= 0 ? `Last leader: ${esc(sim.player(council.lastWinner).name)} (${council.streak} in a row; 2 wins the game).` : "No leader yet."} You bring ${votesOf(sim, me)} votes.`
			: "The World Council forms when any civ researches Statecraft. Win two elections in a row for a diplomatic victory.";
		// Before Diplomacy only war and peace are open; the rest of the screen says what the tech brings
		const locked = sim.hasTech(me, "diplomacy") ? "" : `<div class="tech-note">Until you research <a href="#" class="tech-link" data-action="show-tech" data-tech="diplomacy" data-for="Treaties and deals">Diplomacy</a> you can only declare war and make peace. It opens alliances, open borders, pacts, exchanges, research agreements, barter, gifts, demands, denouncing and sanctions.</div>`;

		return `<h3>Diplomacy <span class="dim">${stars(sim.player(me).stars)}</span></h3>
			${locked}
			${incoming ? `<div class="incoming">${incoming}</div>` : ""}
			<div class="diplo2"><div class="civs">${list || `<span class="dim">No other civs.</span>`}</div>
			<div class="civ-detail">${this.civ >= 0 ? this.detail(sim, me, this.civ) : `<p class="dim">You haven't met anyone yet. Explore to find other civilisations.</p>`}</div></div>
			<p class="dim small">${councilText}</p>`;
	}

	detail (sim: Sim, me: number, o: number): string {
		const q = sim.player(o);
		const d = sim.state.diplomacy;
		const n = sim.playerCount;
		const rel = sim.relation(me, o);
		const out: string[] = [];
		const person = this.playerName(o);
		out.push(`<div class="title">${swatch(q.color)}${esc(q.name)}${person ? ` &middot; ${esc(person)}` : ""} <span class="dim small">${esc(CIVS[q.civ].perk)}</span></div>`);

		// Standing
		const truce = truceUntil(sim, me, o);
		const treaties = [
			d.openBorders[me * n + o] ? "Open borders" : "",
			d.trade[me * n + o] ? "Trade agreement" : "",
			hasPact(sim, me, o) ? "Defensive pact" : "",
			...d.treaties.filter((t) => (t.a === me && t.b === o) || (t.a === o && t.b === me)).map((t) => treatyLine(sim, me, t))
		].filter(Boolean);
		const since = d.warSince?.[me * n + o] ?? 0;
		const relName = rel === WAR ? `<b class="bad">At war</b> <span class="dim small">since turn ${since}${sim.state.turn - since >= 12 ? ", both sides are tiring of it" : ""}</span>` : rel === ALLIANCE ? `<b class="good">Allied</b>` : "At peace";
		out.push(`<div>${relName}${truce ? ` &middot; truce until turn ${truce}` : ""}${treaties.length ? ` &middot; ${treaties.join(" &middot; ")}` : ""}</div>`);
		if (q.human) {
			out.push(`<div class="dim small">${person ? `${esc(person)} plays this civ.` : "A person plays this civ."}</div>`);
		} else {
			const feel = attitude(sim, o, me);
			const factors = attitudeFactors(sim, o, me).map((f) => `<li class="${f.delta > 0 ? "good" : "bad"}">${f.delta > 0 ? "+" : ""}${f.delta.toFixed(2)} ${esc(f.label)}</li>`).join("");
			out.push(`<div>Mood: <b>${mood(sim, o, me)}</b> <span class="dim small">(${feel.toFixed(1)}; changes each turn)</span></div>`);
			if (factors) out.push(`<ul class="factors">${factors}</ul>`);
			if (q.agenda) out.push(`<div>Agenda: <b>${AGENDAS[q.agenda].name}</b> <span class="dim small">${AGENDAS[q.agenda].description}</span></div>`);
		}
		if (q.ambition) out.push(`<div>Ambition: <b>${AMBITIONS[q.ambition].name}</b> <span class="dim small">${q.milestones.length}/4 milestones${q.legacy ? ", legacy earned" : ""}</span></div>`);
		const theirs = grievance(sim, o, me), mine = grievance(sim, me, o);
		if (theirs > 0.05 || mine > 0.05) {
			out.push(`<div>Grievances: they hold <b>${theirs.toFixed(1)}</b> against you; you hold <b>${mine.toFixed(1)}</b> against them${justified(sim, me, o) ? ` <span class="good">(enough for a justified war)</span>` : ""}</div>`);
		}
		out.push(`<div class="dim small">${votesOf(sim, o)} World Council votes</div>`);

		// Actions
		const deal = (kind: DealKind, label: string, extra: DealTerms = {}) => {
			const problem = proposalProblem(sim, me, o, kind, extra);
			return actionButton("propose", label, { player: o, kind, ...(extra.stars ? { stars: extra.stars } : {}) }, problem);
		};
		const treatyButtons = rel === WAR
			? deal("peace", `Propose peace <small>then a ${TRUCE_TURNS}-turn truce</small>`)
			: [deal("alliance", "Alliance <small>shared vision, defend each other</small>"), deal("pact", "Defensive pact <small>defend each other</small>"), deal("openBorders", "Open borders"), deal("trade", "Trade agreement <small>stars each turn</small>")].join("");
		out.push(`<h5>Treaties</h5><div class="actions">${treatyButtons}</div>`);
		if (rel !== WAR) {
			out.push(`<h5>Actions</h5><div class="actions">
				${deal("exchange", `Cultural exchange <small>&#9733;${EXCHANGE_COST}: +1&#9733;/turn each, ${EXCHANGE_TURNS} turns</small>`)}
				${deal("research", `Research agreement <small>&#9733;${agreementCost(sim, me)} each: free tech in ${RESEARCH_TURNS} turns</small>`)}
				${deal("gift", "Gift &#9733;5", { stars: 5 })}
				${actionButton("denounce", `Denounce <small>&#9733;${DENOUNCE_COST}: they and their friends resent it</small>`, { player: o }, actionProblem(sim, me, o, "denounce"), "")}
				${actionButton("sanction", `Sanctions <small>&#9733;${SANCTION_COST}: their income -15% for ${SANCTION_TURNS} turns</small>`, { player: o }, actionProblem(sim, me, o, "sanction"), "")}
			</div>`);
			const cities = sim.citiesOf(o).filter((c) => !proposalProblem(sim, me, o, "city", { city: c.id }));
			if (this.draft.city >= 0 && !cities.some((c) => c.id === this.draft.city)) this.draft.city = -1;
			if (this.draft.city < 0 && cities[0]) this.draft.city = cities[0].id;
			out.push(`<h5>Demands <span class="dim small">(refusing gives you grounds for war; either way they resent it)</span></h5><div class="actions">
				${actionButton("demand-tribute", "Demand &#9733;10", { player: o, stars: 10 }, proposalProblem(sim, me, o, "tribute", { getStars: 10 }))}
				${actionButton("demand-tribute", "Demand &#9733;25", { player: o, stars: 25 }, proposalProblem(sim, me, o, "tribute", { getStars: 25 }))}
				${cities.length ? `<select data-deal="city">${cities.map((c) => `<option value="${c.id}" ${c.id === this.draft.city ? "selected" : ""}>${esc(c.name)} (level ${c.level})</option>`).join("")}</select>${actionButton("demand-city", "Demand city", { player: o })}` : `<span class="dim small">No city of theirs near yours to demand.</span>`}
			</div>`);
			out.push(this.editor(sim, me, o));
		}
		const war = warProblem(sim, me, o);
		if (rel !== WAR) {
			const fair = justified(sim, me, o);
			const label = fair ? "Declare war <small>justified: your grievances back it</small>" : `Declare war <small>a surprise war: everyone will resent it (grounds need ${CASUS_BELLI} grievances)</small>`;
			out.push(`<h5>War</h5><div class="actions">${actionButton("war", label, { player: o }, war, "danger")}</div>`);
		}
		return out.join("");
	}

	editor (sim: Sim, me: number, o: number): string {
		const mine = civStock(sim, me);
		const input = (field: string, value: number, max?: number) => `<input type="number" min="0" ${max !== undefined ? `max="${max}"` : ""} step="1" data-deal="${field}" value="${value || ""}" placeholder="0">`;
		const giveGoods = GOODS.filter((g) => (mine[g] ?? 0) > 0).map((g) => `<label>${goodChip(g)}<span class="dim small">/${mine[g]}</span>${input(`give:${g}`, this.draft.give[g] ?? 0, mine[g])}</label>`).join("");
		const getGoods = GOODS.map((g) => `<label>${goodChip(g)}${input(`get:${g}`, this.draft.get[g] ?? 0)}</label>`).join("");
		return `<h5>Trade goods and stars <span class="dim small">(goods leave your stores and arrive at their capital)</span></h5>
			<div class="deal">
				<div><b>You give</b><label class="starline">Stars ${input("stars", this.draft.stars, Math.floor(sim.player(me).stars))}</label><div class="deal-goods">${giveGoods || `<span class="dim small">Your stores are empty.</span>`}</div></div>
				<div><b>You ask for</b><label class="starline">Stars ${input("getStars", this.draft.getStars)}</label><div class="deal-goods">${getGoods}</div></div>
			</div>
			<label class="check"><input type="checkbox" data-deal="route" ${this.draft.route ? "checked" : ""}> Every turn for ${ROUTE_TURNS} turns (a trade route: your road networks must touch)</label>
			<div class="actions"><button class="primary" data-action="propose-deal" data-player="${o}">Propose trade</button><span id="dealHint">${this.hint(sim, me)}</span></div>`;
	}
}

function mood (sim: Sim, o: number, me: number): string {
	if (sim.player(o).human) return "Human";
	const feel = attitude(sim, o, me);
	return feel >= 5 ? "Friendly" : feel >= 1 ? "Cordial" : feel > -3 ? "Neutral" : feel > -6 ? "Wary" : "Hostile";
}

