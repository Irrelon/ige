import { attitude, strength } from "../sim/diplomacy";
import { type AgendaId, AGENDAS, CIVS, personalityOf } from "../sim/rules";
import type { Sim } from "../sim/sim";
import { esc } from "./html";
import { emblem } from "./icons";

/**
 * First contact, as in Polytopia: when you meet another civ, its leader
 * greets you, and what they say depends on their personality and on how
 * your strength compares with theirs (they sneer at a weak tribe and are
 * in awe of a mighty one).
 */

type Standing = "stronger" | "even" | "weaker";

const GREETINGS: Record<AgendaId, Record<Standing, string>> = {
	expansionist: {
		stronger: "There is little room left in this world for a tribe as small as yours. Keep to your own valleys.",
		even: "The land between us will not stay empty for long. Let us see who settles it first.",
		weaker: "So many cities! Perhaps your people could teach ours how to grow."
	},
	merchant: {
		stronger: "A small tribe, but every tribe has something to sell. Our caravans are at your service.",
		even: "Greetings, friend! Our roads could carry your goods, and our goods could fill your stores.",
		weaker: "Your markets must be the envy of the world. We would be honoured to trade with you."
	},
	militarist: {
		stronger: "Your puny tribe makes us laugh. Stay out of our way and you might live.",
		even: "We respect strength. Show us yours, and perhaps we will talk.",
		weaker: "Your warriors are many... for now. We will be watching you."
	},
	builder: {
		stronger: "Have your people built nothing worth seeing? Come, and marvel at our works.",
		even: "Our monuments will outlast yours. Still, the world has room for two great peoples.",
		weaker: "We are in awe of all your people have raised. Might we learn from your builders?"
	},
	peacemaker: {
		stronger: "Be at ease, little neighbour. We come in peace and wish you no harm.",
		even: "May there always be peace between our peoples.",
		weaker: "We are in awe of your great tribe. We ask only to live beside you in peace."
	},
	scholar: {
		stronger: "Your people seem untaught. Still, any tribe can learn, given time.",
		even: "Knowledge shared is knowledge doubled. Shall we trade ideas?",
		weaker: "Your learning is famous even here. We would gladly study at your feet."
	}
};

/** How strong they are next to you. */
function standing (sim: Sim, them: number, me: number): Standing {
	const ratio = strength(sim, them) / Math.max(1, strength(sim, me));
	return ratio > 1.4 ? "stronger" : ratio < 0.7 ? "weaker" : "even";
}

export function greeting (sim: Sim, them: number, me: number): string {
	const agenda = sim.player(them).agenda;
	if (!agenda) return "Greetings, neighbour.";
	return GREETINGS[agenda][standing(sim, them, me)];
}

function moodOf (sim: Sim, them: number, me: number): [string, string] {
	const feel = attitude(sim, them, me);
	const m = feel >= 5 ? "Friendly" : feel >= 1 ? "Cordial" : feel > -3 ? "Neutral" : feel > -6 ? "Wary" : "Hostile";
	return [m, `mood-${m.toLowerCase()}`];
}

/** The first-contact card (shown as a modal). */
export function contactModal (sim: Sim, them: number, me: number, name: string): string {
	const q = sim.player(them);
	const [tribe, banner] = name.split(" (");
	const agenda = q.agenda;
	const pers = personalityOf(agenda);
	const [mood, moodCls] = moodOf(sim, them, me);
	const std = standing(sim, them, me);
	const sizeLine = std === "stronger" ? "They are stronger than you." : std === "weaker" ? "You are stronger than they are." : "You are evenly matched.";
	return `<div class="contact-card" style="--c:${q.color}">
		<div class="contact-crest">${emblem(q.civ, 40)}</div>
		<div class="contact-kicker">First contact</div>
		<h2>${esc(tribe)}</h2>
		<div class="contact-banner">${esc((banner ?? "").replace(")", ""))} banner &middot; ${esc(CIVS[q.civ].name)}</div>
		<blockquote>&ldquo;${esc(greeting(sim, them, me))}&rdquo;</blockquote>
		<div class="contact-tags">
			${agenda ? `<span class="pill gold" title="${esc(AGENDAS[agenda].description)}">${AGENDAS[agenda].name}</span>` : ""}
			<span class="pill ${moodCls}">${mood}</span>
			<span class="pill">${sizeLine}</span>
		</div>
		${agenda ? `<p class="contact-note">${esc(pers.temper)} ${esc(AGENDAS[agenda].description)}</p>` : ""}
		<div class="contact-actions">
			<button class="primary" data-action="contact-diplo" data-player="${them}">Open diplomacy</button>
			<button data-action="contact-ok">Continue</button>
		</div>
	</div>`;
}
