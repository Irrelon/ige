import { GOODS } from "../sim/rules";
import { defaultOptions, Sim } from "../sim/sim";
import { Relief, Terrain } from "../terrain";
import { termCard, type TermKey } from "./glossary";

describe("glossary", () => {
	test("every good, terrain and relief has a card; goods say what makes and uses them", () => {
		const sim = Sim.create(defaultOptions({ width: 24, height: 16, players: 2, humans: [0], seed: 3 }));
		const keys: TermKey[] = [
			...GOODS.map((g) => `good:${g}` as TermKey),
			...[Terrain.DeepOcean, Terrain.Ocean, Terrain.Ice, Terrain.Grassland, Terrain.Plains, Terrain.Desert, Terrain.Tundra, Terrain.Snow].map((t) => `terrain:${t}` as TermKey),
			`relief:${Relief.Hills}`, `relief:${Relief.Mountain}`, "forest", "river", "camp"
		];
		for (const key of keys) {
			const card = termCard(sim, key);
			expect(card.title.length).toBeGreaterThan(0);
			expect(card.html.length).toBeGreaterThan(20);
		}
		const coal = termCard(sim, "good:coal").html;
		expect(coal).toMatch(/Made by/);
		expect(coal).toMatch(/Mine/);
		expect(coal).toMatch(/Smelter/);
		expect(termCard(sim, "good:planks").html).toMatch(/Sawmill/);
		expect(termCard(sim, "good:fish").html).toMatch(/Food/);
	});
});
