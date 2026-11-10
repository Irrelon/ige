import { CHARACTERS, RIDERS } from "./characters";
import { BLOCKY_IDS, blockyModel } from "./index";
import { type Box, separatedBoxes } from "./mesh";
import { PROPS } from "./props";

describe("blocky art pack", () => {
	test("every model builds, stands on the ground, and characters have their clips", () => {
		const rows: string[] = [];
		for (const id of BLOCKY_IDS) {
			const m = blockyModel(id);
			expect(m).not.toBeNull();
			if (!m) continue;
			expect(m.triangles).toBeGreaterThan(0);
			expect(m.max[1]).toBeGreaterThan(m.min[1]);
			// Feet or ground slab at the bottom (a little below for the dirt under a lawn or a keel)
			if (id !== "millSails") expect(m.min[1]).toBeGreaterThan(-2);
			const gltf = m.gltf as { buffers: { uri: string }[]; accessors: unknown[] };
			expect(gltf.buffers[0].uri.startsWith("data:application/octet-stream;base64,")).toBe(true);
			if (m.skinned) {
				for (const clip of ["idle", "walk", "attack", "hit", "death"]) expect(m.animations).toContain(clip);
				if (id.startsWith("worker")) expect(m.animations).toContain("work");
			}
			rows.push(`${id}: ${m.triangles} triangles, ${Math.round(m.bytes / 1024)} KB, ${(m.max[0] - m.min[0]).toFixed(0)} x ${(m.max[1] - m.min[1]).toFixed(0)} x ${(m.max[2] - m.min[2]).toFixed(0)}${m.skinned ? `, clips ${m.animations.join(" ")}` : ""}`);
		}
		if (process.env.BLOCKY_LIST) console.log(rows.join("\n"));
	});

	test("it covers every unit, worker and building the game draws", () => {
		const want = [
			"warrior", "archer", "swordsman", "settler", "rider", "catapult", "defender", "musketeer", "rifleman", "infantry", "mechInfantry", "exoTrooper",
			"crossbowman", "machineGunner", "laserTrooper", "knight", "cavalry", "tank", "hoverTank", "trebuchet", "cannon", "artillery", "rocketArtillery", "railgun",
			"workerCarrier", "workerMiner", "workerWoodcutter", "workerFisher", "workerFarmer", "workerSmith",
			"village", "town", "city", "construction", "boat", "millBody", "millSails",
			"woodcutter", "quarry", "mine", "farm", "fishery", "hunter", "pasture", "sawmill", "smelter", "mill", "mint", "toolsmith", "armoury", "bakery",
			"steelworks", "powderMill", "factory", "electronicsWorks", "warehouse", "market", "port",
			"greatLibrary", "greatWall", "colossus", "hangingGardens", "grandBazaar", "imperialRoad", "hallOfHeroes", "observatory", "councilHall", "grandExchange",
			"victoryArch", "grandFountain", "sageTower", "gildedVault", "pathfinderCairn", "marketCross", "artisansColumn", "peaceGarden"
		];
		expect(want.filter((id) => !BLOCKY_IDS.includes(id))).toEqual([]);
	});

	test("no two faces lie in the same plane facing the same way (they would flicker)", () => {
		const boxesOf = (id: string): Box[] => (CHARACTERS[id] ?? RIDERS[id])?.().vox.boxes ?? PROPS[id]().boxes;
		const clashes: string[] = [];
		for (const id of BLOCKY_IDS) {
			const boxes = separatedBoxes(boxesOf(id));
			for (let i = 0; i < boxes.length; i++) {
				for (let j = 0; j < i; j++) {
					for (let axis = 0; axis < 3; axis++) {
						for (const side of [0, 1]) {
							if (axis === 1 && side === 0) continue;
							if (Math.abs(boxes[i][side][axis] - boxes[j][side][axis]) > 1e-3) continue;
							const overlap = [0, 1, 2].every((k) => k === axis || Math.min(boxes[i][1][k], boxes[j][1][k]) - Math.max(boxes[i][0][k], boxes[j][0][k]) > 1e-4);
							if (overlap) clashes.push(`${id}: boxes ${j} and ${i}`);
						}
					}
				}
			}
		}
		expect(clashes.slice(0, 10)).toEqual([]);
	});
});
