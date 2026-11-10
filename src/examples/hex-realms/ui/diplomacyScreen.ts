import {
	actionProblem, agreementCost, aiAccepts, attitude, attitudeFactors, civStock, cleanGoods, type DealTerms, endTreatyProblem, grievance, hasPact, justified,
	proposalProblem, strandedUnits, truceUntil, votesOf, warProblem
} from "../sim/diplomacy";
import {
	AGENDAS, PERSONALITIES, AMBITIONS, CASUS_BELLI, CIVS, DENOUNCE_COST, EXCHANGE_COST, EXCHANGE_TURNS, GOODS, type Good, type Goods,
	END_TRUCE_TURNS, type EndableTreaty, RESEARCH_TURNS, ROUTE_TURNS, SANCTION_COST, SANCTION_TURNS, TRUCE_TURNS, UNIT_TYPES
} from "../sim/rules";
import type { Sim } from "../sim/sim";
import { ALLIANCE, type Command, type DealKind, NEUTRAL, type ProposalState, type TreatyState, WAR } from "../sim/types";
import { actionButton, esc, goodChip, goodsInline, stars, swatch } from "./html";

/**
 * The diplomacy screen. On the left, the civs you know; on the right, the one
 * selected: a short header (relation, mood, treaties), a few facts about it,
 * and what you can do, one option per row, split into three tabs so only a
 * handful of choices show at once:
 * - Agreements: alliance, pact, open borders, trade, exchange, research
 * - Trade: a gift, and a two-column table of stars and goods to swap
 * - Pressure: demands, denouncing, sanctions and war
 * At war, or before you have Diplomacy, there are no tabs: just peace or war.
 */

export type DiplomacyTab = "agreements" | "trade" | "pressure";

const TABS: [DiplomacyTab, string][] = [["agreements", "Agreements"], ["trade", "Trade"], ["pressure", "Pressure"]];

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

/** A small coloured label. */
const pill = (text: string, cls = "", title = "") => `<span class="pill ${cls}"${title ? ` title="${esc(title)}"` : ""}>${text}</span>`;

function relationPill (rel: number, long = false): string {
	if (rel === WAR) return pill(long ? "At war" : "War", "war");
	if (rel === ALLIANCE) return pill(long ? "Allied" : "Ally", "ally");
	if (rel === NEUTRAL) return pill("Unaligned", "neutral", "Newly met: no treaty yet. Units may cross each other's land; the first attack starts a war.");
	return pill(long ? "At peace" : "Peace", "peace");
}

/** A running treaty as a label, its terms in the tooltip. */
function treatyPill (sim: Sim, me: number, t: TreatyState): string {
	const left = t.until - sim.state.turn;
	const turns = `${left} turn${left === 1 ? "" : "s"} left`;
	switch (t.kind) {
		case "exchange": return pill("Cultural exchange", "", turns);
		case "research": return pill("Research agreement", "", turns);
		case "sanction": return t.a === me ? pill("Your sanctions", "warn", turns) : pill("Their sanctions", "war", turns);
		case "route": {
			const mine = t.a === me;
			const [a, b] = terms(t.give, t.stars ?? 0, t.get, t.getStars ?? 0);
			const plain = (s: string) => s.replace(/&#9733;/g, "★");
			return pill("Trade route", "", `${mine ? "You send" : "They send"} ${plain(a)}; ${mine ? "they send" : "you send"} ${plain(b)} each turn (${turns})`);
		}
	}
}

/** One option: what it is on the left, its button (or why it can't be done) on the right. */
function row (title: string, desc: string, ctl: string): string {
	return `<div class="dp-row"><div class="dp-row-text"><b>${title}</b>${desc ? `<small>${desc}</small>` : ""}</div><div class="dp-row-ctl">${ctl}</div></div>`;
}

/** A button, or the reason it can't be pressed. */
function control (action: string, label: string, data: Record<string, string | number>, problem: string | null, cls = ""): string {
	return problem ? `<span class="dp-why">${esc(problem)}</span>` : actionButton(action, label, data, null, cls);
}

function mood (sim: Sim, o: number, me: number): string {
	if (sim.player(o).human) return "Human";
	const feel = attitude(sim, o, me);
	return feel >= 5 ? "Friendly" : feel >= 1 ? "Cordial" : feel > -3 ? "Neutral" : feel > -6 ? "Wary" : "Hostile";
}

const moodPill = (sim: Sim, o: number, me: number) => {
	const m = mood(sim, o, me);
	return pill(m, `mood-${m.toLowerCase()}`, `Mood ${attitude(sim, o, me).toFixed(1)}; it drifts each turn`);
};

export class DiplomacyScreen {
	civ = -1;
	tab: DiplomacyTab = "agreements";
	/** An agreement the player has asked to end, awaiting confirmation. */
	confirmEnd: { civ: number; kind: EndableTreaty } | null = null;
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

	setTab (tab: string): void {
		if (TABS.some(([t]) => t === tab)) this.tab = tab as DiplomacyTab;
		this.confirmEnd = null;
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
		const known = others.filter((q) => q.alive && sim.hasMet(me, q.index));
		if (!known.some((q) => q.index === this.civ)) this.civ = known[0]?.index ?? -1;

		const incoming = d.proposals.filter((pr) => pr.to === me).map((pr) =>
			`<div class="dp-offer"><span>${describeProposal(sim, pr)}</span><span class="dp-row-ctl"><button class="primary" data-action="respond" data-proposal="${pr.id}" data-accept="1">Accept</button><button data-action="respond" data-proposal="${pr.id}" data-accept="0">Decline</button></span></div>`
		).join("");

		const list = known.map((q) => {
			const o = q.index;
			const pending = d.proposals.some((pr) => pr.to === me && pr.from === o) ? `<span class="badge" title="Waiting for your answer">!</span>` : "";
			const person = this.playerName(o);
			const sub = q.human ? `<span class="dim">${person ? esc(person) : "Human"}</span>` : `<span class="mood-${mood(sim, o, me).toLowerCase()}">${mood(sim, o, me)}</span>`;
			return `<button class="dp-civ ${o === this.civ ? "on" : ""}" data-action="diplo-civ" data-player="${o}">
				<span class="dp-civ-name">${swatch(q.color)}${esc(q.name)}${pending}</span>
				<span class="dp-civ-sub">${relationPill(sim.relation(me, o))} ${sub}</span></button>`;
		}).join("");
		const unmet = others.filter((q) => q.alive && !sim.hasMet(me, q.index)).length;
		const gone = others.filter((q) => !q.alive).map((q) => `<div class="dp-civ-note gone">${swatch(q.color)}${esc(q.name)} &middot; destroyed</div>`).join("");

		const council = d.council;
		const councilText = !sim.options.victories.diplomatic ? "" : council.formed
			? `World Council: next vote on turn ${council.nextVote}${council.lastWinner >= 0 ? `; ${esc(sim.player(council.lastWinner).name)} won the last ${council.streak > 1 ? `${council.streak} in a row` : "one"} (two in a row wins)` : ""}. You have ${votesOf(sim, me)} votes.`
			: "The World Council forms when any civ researches Statecraft. Win two of its elections in a row for a diplomatic victory.";

		return `<h3>Diplomacy <span class="dim">${stars(sim.player(me).stars)}</span></h3>
			${incoming ? `<div class="dp-inbox"><div class="dp-label">Waiting for your answer</div>${incoming}</div>` : ""}
			<div class="dp">
				<nav class="dp-civs">${list}${unmet ? `<div class="dp-civ-note">${unmet} civ${unmet === 1 ? "" : "s"} not met yet</div>` : ""}${gone}</nav>
				<section class="dp-main">${this.civ >= 0 ? this.detail(sim, me, this.civ) : `<p class="dim">You haven't met anyone yet. Explore to find other civilisations.</p>`}</section>
			</div>
			${councilText ? `<p class="dp-foot">${councilText}</p>` : ""}`;
	}

	detail (sim: Sim, me: number, o: number): string {
		const q = sim.player(o);
		const d = sim.state.diplomacy;
		const n = sim.playerCount;
		const rel = sim.relation(me, o);
		const person = this.playerName(o);

		// Header: name, then relation, mood and what's in force between you
		const since = d.warSince?.[me * n + o] ?? 0;
		const truce = truceUntil(sim, me, o);
		const tags = [
			rel === WAR ? pill("At war", "war", `Since turn ${since}`) : relationPill(rel, true),
			q.human ? "" : moodPill(sim, o, me),
			truce ? pill(`Truce to turn ${truce}`) : "",
			d.openBorders[me * n + o] ? pill("Open borders") : "",
			d.trade[me * n + o] ? pill("Trade agreement") : "",
			hasPact(sim, me, o) ? pill("Defensive pact") : "",
			...d.treaties.filter((t) => (t.a === me && t.b === o) || (t.a === o && t.b === me)).map((t) => treatyPill(sim, me, t))
		].filter(Boolean).join("");
		const head = `<div class="dp-head"><div class="dp-title">${swatch(q.color)}${esc(q.name)}${person ? ` <span class="dim">${esc(person)}</span>` : ""}</div><div class="dp-tags">${tags}</div></div>`;

		return head + this.facts(sim, me, o) + this.options(sim, me, o);
	}

	/** A few facts about a civ, one per line: perk, why it feels as it does, agenda, ambition, grievances, votes. */
	facts (sim: Sim, me: number, o: number): string {
		const q = sim.player(o);
		const d = sim.state.diplomacy;
		const facts: [string, string][] = [["Perk", esc(CIVS[q.civ].perk)]];
		if (!q.human) {
			const factors = attitudeFactors(sim, o, me).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
			const names = (good: boolean) => factors.filter((f) => (f.delta > 0) === good).slice(0, 3).map((f) => esc(f.label.toLowerCase())).join(", ");
			const likes = names(true), dislikes = names(false);
			const why = [likes ? `<span class="good">Likes</span> ${likes}` : "", dislikes ? `<span class="bad">Dislikes</span> ${dislikes}` : ""].filter(Boolean).join(" &middot; ");
			const all = factors.map((f) => `${f.delta > 0 ? "+" : ""}${f.delta.toFixed(2)} ${f.label}`).join("\n");
			facts.push(["Mood", `<span title="${esc(all || "No strong feelings")}">${why || `<span class="dim">No strong feelings either way</span>`}</span>`]);
			if (q.agenda) facts.push(["Personality", `${AGENDAS[q.agenda].name} <span class="dim">${PERSONALITIES[q.agenda].temper} ${AGENDAS[q.agenda].description}</span>`]);
		}
		if (q.ambition) facts.push(["Ambition", `${AMBITIONS[q.ambition].name} <span class="dim">${q.milestones.length}/4${q.legacy ? ", legacy earned" : ""}</span>`]);
		const theirs = grievance(sim, o, me), mine = grievance(sim, me, o);
		if (theirs > 0.05 || mine > 0.05) {
			facts.push(["Grievances", `Theirs ${theirs.toFixed(1)} &middot; yours ${mine.toFixed(1)}${justified(sim, me, o) ? ` <span class="good">enough for a justified war</span>` : ""}`]);
		}
		if (sim.options.victories.diplomatic && d.council.formed) facts.push(["Council", `${votesOf(sim, o)} votes`]);
		return `<dl class="dp-facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
	}

	/** What you can do towards a civ. */
	options (sim: Sim, me: number, o: number): string {
		const q = sim.player(o);
		const rel = sim.relation(me, o);
		const deal = (kind: DealKind, label = "Propose", extra: DealTerms = {}) =>
			control("propose", label, { player: o, kind, ...(extra.stars ? { stars: extra.stars } : {}) }, proposalProblem(sim, me, o, kind, extra));

		if (rel === WAR) {
			const since = sim.state.diplomacy.warSince?.[me * sim.playerCount + o] ?? 0;
			const tired = sim.state.turn - since >= 12 ? " Both sides are tiring of this war." : "";
			return `<div class="dp-rows">${row("Peace", `Ends the war, then a ${TRUCE_TURNS}-turn truce.${tired}`, deal("peace", "Propose peace"))}</div>`;
		}

		if (rel === NEUTRAL) {
			return `<div class="dp-note">You have only just met ${esc(q.name)}. There is no treaty between you: your units may cross each other's land, and the first blow struck starts a war.</div>
				<div class="dp-rows">${row("Make peace", "A formal peace: borders close to soldiers, and deals become possible.", deal("peace", "Propose peace"))}${row("Declare war", "Nobody minds much: you never made peace.", control("war", "Declare war", { player: o }, warProblem(sim, me, o), "danger"))}</div>`;
		}

		const fair = justified(sim, me, o);
		const war = row("Declare war", fair ? "Justified: your grievances back it." : `A surprise war: every civ will resent it. It's justified once you hold ${CASUS_BELLI} grievances.`,
			control("war", "Declare war", { player: o }, warProblem(sim, me, o), "danger"));
		if (!sim.hasTech(me, "diplomacy")) {
			return `<div class="dp-note">Research <a href="#" class="tech-link" data-action="show-tech" data-tech="diplomacy" data-for="Treaties and deals">Diplomacy</a> to make agreements, trade and demands. Until then you can only declare war or make peace.</div>
				<div class="dp-rows">${war}</div>`;
		}

		const tabs = `<div class="dp-tabs">${TABS.map(([t, label]) => `<button class="${t === this.tab ? "on" : ""}" data-action="diplo-tab" data-tab="${t}">${label}</button>`).join("")}</div>`;
		const notYet = `<div class="dp-note">${esc(q.name)} hasn't researched Diplomacy yet, so they can't make agreements or trade. You can still pressure them.</div>`;
		const theyCan = sim.hasTech(o, "diplomacy");
		let body = "";
		switch (this.tab) {
			case "agreements":
				body = !theyCan ? notYet : [
					this.agreement(sim, me, o, "alliance", "Alliance", "Shared vision; you defend each other in war.", deal("alliance")),
					this.agreement(sim, me, o, "pact", "Defensive pact", "Each joins in if the other is attacked.", deal("pact")),
					this.agreement(sim, me, o, "openBorders", "Open borders", "Your units may cross each other's land.", deal("openBorders")),
					this.agreement(sim, me, o, "trade", "Trade agreement", "Both earn stars each turn.", deal("trade")),
					row(`Cultural exchange ${stars(EXCHANGE_COST)}`, `You pay; both gain a star a turn for ${EXCHANGE_TURNS} turns.`, deal("exchange")),
					row(`Research agreement ${stars(agreementCost(sim, me))}`, `Each pays; both get a free technology in ${RESEARCH_TURNS} turns.`, deal("research"))
				].join("");
				break;
			case "trade":
				body = !theyCan ? notYet : this.agreement(sim, me, o, "route", "Trade routes", "", "")
					+ row(`Gift ${stars(5)}`, "Warms their mood towards you.", deal("gift", "Give", { stars: 5 })) + this.editor(sim, me, o);
				break;
			case "pressure": {
				const t10 = proposalProblem(sim, me, o, "tribute", { getStars: 10 }), t25 = proposalProblem(sim, me, o, "tribute", { getStars: 25 });
				const tribute = t10 && t10 === t25 ? control("", "", {}, t10)
					: control("demand-tribute", `Demand ${stars(10)}`, { player: o, stars: 10 }, t10) + control("demand-tribute", `Demand ${stars(25)}`, { player: o, stars: 25 }, t25);
				const cities = sim.citiesOf(o).filter((c) => !proposalProblem(sim, me, o, "city", { city: c.id }));
				if (this.draft.city >= 0 && !cities.some((c) => c.id === this.draft.city)) this.draft.city = -1;
				if (this.draft.city < 0 && cities[0]) this.draft.city = cities[0].id;
				const cityProblem = theyCan ? (cities.length ? null : "None of their cities are near yours") : "They haven't researched Diplomacy";
				const city = cityProblem ? control("", "", {}, cityProblem)
					: `<select data-deal="city">${cities.map((c) => `<option value="${c.id}" ${c.id === this.draft.city ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>${actionButton("demand-city", "Demand", { player: o })}`;
				body = [
					row("Demand tribute", "If they refuse you gain grounds for war. Either way they resent it.", tribute),
					row("Demand a city", "One of theirs near your own. Never a capital.", city),
					row(`Denounce ${stars(DENOUNCE_COST)}`, "They and their friends resent you.", control("denounce", "Denounce", { player: o }, actionProblem(sim, me, o, "denounce"))),
					row(`Sanctions ${stars(SANCTION_COST)}`, `Their income falls 15% for ${SANCTION_TURNS} turns.`, control("sanction", "Impose", { player: o }, actionProblem(sim, me, o, "sanction"))),
					war
				].join("");
				break;
			}
		}
		return tabs + `<div class="dp-rows">${body}</div>`;
	}

	/**
	 * An agreement's row: when it's in force, what it does and a button to end
	 * it (which asks first); otherwise, what it would do and how to propose it
	 * (`offer`; "" shows nothing, as for trade routes, made in the trade table).
	 */
	agreement (sim: Sim, me: number, o: number, kind: EndableTreaty, title: string, desc: string, offer: string): string {
		if (endTreatyProblem(sim, me, o, kind)) return offer ? row(title, desc, offer) : "";
		if (this.confirmEnd?.civ === o && this.confirmEnd.kind === kind) return this.endWarning(sim, me, o, kind);
		const routes = sim.state.diplomacy.treaties.filter((t) => t.kind === "route" && ((t.a === me && t.b === o) || (t.a === o && t.b === me))).length;
		const now = kind === "route" ? `${routes} running, delivering goods every turn.` : kind === "openBorders" ? "Open now." : "In force now.";
		return row(title, `${now} You can end ${kind === "route" ? "them" : "it"} at any time.`, actionButton("end-ask", kind === "openBorders" ? "Close" : "End", { player: o, kind }));
	}

	/** What ending an agreement would do, with buttons to go ahead or keep it. */
	endWarning (sim: Sim, me: number, o: number, kind: EndableTreaty): string {
		const name = esc(sim.player(o).name);
		const lost = strandedUnits(sim, me, o, kind);
		const units = (k: number) => (k === 1 ? "1 unit" : `${k} units`);
		const lines: string[] = [];
		if (kind === "alliance") lines.push("You'll be at peace: no more shared vision, and neither of you defends the other.");
		if (kind === "pact") lines.push("Neither of you will join the other's defensive wars any more.");
		if (kind === "trade") lines.push("Both of you stop earning stars from it.");
		if (kind === "route") lines.push("Deliveries stop both ways; goods already on the road still arrive.");
		if (lost.length) {
			lines.push(`<li class="bad"><b>Your ${units(lost.length)} in their land will be destroyed:</b> ${esc(lost.map((u) => UNIT_TYPES[u.type].name).join(", "))}.`);
		} else if (kind === "openBorders" || (kind === "alliance" && !sim.state.diplomacy.openBorders[me * sim.playerCount + o])) {
			lines.push("None of your units are in their land, so you lose nothing.");
		}
		if (kind === "openBorders" || (kind === "alliance" && !sim.state.diplomacy.openBorders[me * sim.playerCount + o])) {
			lines.push("Their units already in your land stay and can move around it, but no more can enter unless they declare war.");
		}
		if (kind === "alliance" || kind === "pact") lines.push(`Neither side can declare war for ${END_TRUCE_TURNS} turns.`);
		lines.push(kind === "alliance" ? "They will resent it, and it gives them a grievance against you." : kind === "pact" ? "They will take it badly." : "They will take it as a snub.");
		const what = { openBorders: ["Close borders with", "Close borders", "Keep them open"], trade: ["End the trade agreement with", "End agreement", "Keep it"], route: ["End all trade routes with", "End routes", "Keep them"], pact: ["End the defensive pact with", "End pact", "Keep it"], alliance: ["End the alliance with", "End alliance", "Keep it"] }[kind];
		return `<div class="dp-confirm">
				<b>${what[0]} ${name}?</b>
				<ul>${lines.map((l) => (l.startsWith("<li") ? l : `<li>${l}`) + "</li>").join("")}</ul>
				<div class="dp-row-ctl">${actionButton("end-treaty", lost.length ? `${what[1]} and lose ${units(lost.length)}` : what[1], { player: o, kind }, null, "danger")}${actionButton("end-cancel", what[2])}</div>
			</div>`;
	}

	/** The trade table: stars and each good either side holds, what you give on the left and what you get on the right. */
	editor (sim: Sim, me: number, o: number): string {
		const mine = civStock(sim, me), theirs = civStock(sim, o);
		const cell = (field: string, value: number, max: number) => max > 0
			? `<input type="number" min="0" max="${max}" step="1" data-deal="${field}" value="${value || ""}" placeholder="0"><span class="dim small">of ${max}</span>`
			: `<span class="dim">&ndash;</span>`;
		const goods = GOODS.filter((g) => (mine[g] ?? 0) > 0 || (theirs[g] ?? 0) > 0);
		const rows = [
			`<tr><th><span class="stars">&#9733;</span> Stars</th><td>${cell("stars", this.draft.stars, Math.floor(sim.player(me).stars))}</td><td>${cell("getStars", this.draft.getStars, Math.floor(sim.player(o).stars))}</td></tr>`,
			...goods.map((g) => `<tr><th>${goodChip(g)}</th><td>${cell(`give:${g}`, this.draft.give[g] ?? 0, mine[g] ?? 0)}</td><td>${cell(`get:${g}`, this.draft.get[g] ?? 0, theirs[g] ?? 0)}</td></tr>`)
		].join("");
		return `<div class="dp-trade">
				<div class="dp-row-text"><b>Swap stars and goods</b><small>Goods leave your stores and arrive at their capital.</small></div>
				<table><thead><tr><th></th><th>You give</th><th>You get</th></tr></thead><tbody>${rows}</tbody></table>
				<label class="check"><input type="checkbox" data-deal="route" ${this.draft.route ? "checked" : ""}> Repeat every turn for ${ROUTE_TURNS} turns <span class="dim">(your road networks must touch)</span></label>
				<div class="dp-propose"><button class="primary" data-action="propose-deal" data-player="${o}">Propose trade</button><span id="dealHint">${this.hint(sim, me)}</span></div>
			</div>`;
	}
}
