/**
 * Benchmark scenes, in metres, shaped like the zombie ARPG's physics load.
 * Every engine runs them through the same adapter calls (see adapters/).
 */

export const DT = 1 / 60;

/** Deterministic random numbers, so every engine gets the same layout. */
export function random (seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * An 11-part ragdoll standing upright (feet at y = 0.02), boxes with small
 * gaps between them, joined by ball joints at the gaps.
 */
export const RAGDOLL = {
	parts: [
		{ name: "pelvis", x: 0, y: 1.0, z: 0, hx: 0.15, hy: 0.1, hz: 0.1 },
		{ name: "torso", x: 0, y: 1.32, z: 0, hx: 0.17, hy: 0.2, hz: 0.1 },
		{ name: "head", x: 0, y: 1.66, z: 0, hx: 0.1, hy: 0.1, hz: 0.1 },
		{ name: "upperArmL", x: -0.36, y: 1.45, z: 0, hx: 0.15, hy: 0.05, hz: 0.05 },
		{ name: "lowerArmL", x: -0.67, y: 1.45, z: 0, hx: 0.14, hy: 0.045, hz: 0.045 },
		{ name: "upperArmR", x: 0.36, y: 1.45, z: 0, hx: 0.15, hy: 0.05, hz: 0.05 },
		{ name: "lowerArmR", x: 0.67, y: 1.45, z: 0, hx: 0.14, hy: 0.045, hz: 0.045 },
		{ name: "upperLegL", x: -0.09, y: 0.66, z: 0, hx: 0.06, hy: 0.2, hz: 0.06 },
		{ name: "lowerLegL", x: -0.09, y: 0.22, z: 0, hx: 0.05, hy: 0.2, hz: 0.05 },
		{ name: "upperLegR", x: 0.09, y: 0.66, z: 0, hx: 0.06, hy: 0.2, hz: 0.06 },
		{ name: "lowerLegR", x: 0.09, y: 0.22, z: 0, hx: 0.05, hy: 0.2, hz: 0.05 }
	],
	joints: [
		{ a: 0, b: 1, x: 0, y: 1.11, z: 0 },
		{ a: 1, b: 2, x: 0, y: 1.54, z: 0 },
		{ a: 1, b: 3, x: -0.19, y: 1.45, z: 0 },
		{ a: 3, b: 4, x: -0.52, y: 1.45, z: 0 },
		{ a: 1, b: 5, x: 0.19, y: 1.45, z: 0 },
		{ a: 5, b: 6, x: 0.52, y: 1.45, z: 0 },
		{ a: 0, b: 7, x: -0.09, y: 0.88, z: 0 },
		{ a: 7, b: 8, x: -0.09, y: 0.44, z: 0 },
		{ a: 0, b: 9, x: 0.09, y: 0.88, z: 0 },
		{ a: 9, b: 10, x: 0.09, y: 0.44, z: 0 }
	]
};

/** 60 x 60 m floor, walls round it, and 12 pillars (a lobby, like the zombie demo's). */
function arena (a) {
	a.addStaticBox(0, -0.5, 0, 30, 0.5, 30);
	a.addStaticBox(0, 1.5, -30.5, 31, 2, 0.5);
	a.addStaticBox(0, 1.5, 30.5, 31, 2, 0.5);
	a.addStaticBox(-30.5, 1.5, 0, 0.5, 2, 31);
	a.addStaticBox(30.5, 1.5, 0, 0.5, 2, 31);
	for (let i = 0; i < 12; i++) {
		const x = ((i % 4) - 1.5) * 12, z = (Math.floor(i / 4) - 1) * 12;
		a.addStaticBox(x, 1.5, z, 0.5, 1.5, 0.5);
	}
}

const ZOMBIE_RADIUS = 0.3, ZOMBIE_HALF_HEIGHT = 0.6; // 1.8 m tall
const ZOMBIE_SPEED = 2.5;

/** Zombies (upright capsules) chasing four players who walk in circles. */
function horde (count) {
	return {
		setup (a) {
			arena(a);
			const zombies = [];
			const perRow = Math.ceil(Math.sqrt(count));
			for (let i = 0; i < count; i++) {
				const x = ((i % perRow) - perRow / 2) * 1.1;
				const z = (Math.floor(i / perRow) - perRow / 2) * 1.1;
				zombies.push(a.addCapsule(x + 0.5, ZOMBIE_HALF_HEIGHT + ZOMBIE_RADIUS + 0.01, z + 0.5, ZOMBIE_RADIUS, ZOMBIE_HALF_HEIGHT));
			}
			return { zombies };
		},
		update (a, state, step) {
			const t = step * DT;
			const players = [0, 1, 2, 3].map((p) => {
				const angle = t * 0.3 + (p * Math.PI) / 2;
				return { x: Math.cos(angle) * 8, z: Math.sin(angle) * 8 };
			});
			for (const zombie of state.zombies) {
				const pos = a.position(zombie);
				let best = Infinity, tx = 0, tz = 0;
				for (const p of players) {
					const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
					if (d < best) { best = d; tx = p.x - pos.x; tz = p.z - pos.z; }
				}
				const len = Math.hypot(tx, tz) || 1;
				a.setVelocityXZ(zombie, (tx / len) * ZOMBIE_SPEED, (tz / len) * ZOMBIE_SPEED);
			}
		},
		check (a, state) {
			let sumY = 0, lost = 0;
			for (const zombie of state.zombies) {
				const y = a.position(zombie).y;
				if (!(y > 0)) lost++;
				else sumY += y;
			}
			return { meanY: +(sumY / Math.max(1, state.zombies.length - lost)).toFixed(3), lost, expectedY: ZOMBIE_HALF_HEIGHT + ZOMBIE_RADIUS };
		}
	};
}

export const SCENES = {
	horde: {
		label: "Horde: 500 zombie capsules steering into each other",
		steps: 600,
		...horde(500)
	},
	debris: {
		label: "Debris: 1000 boxes falling into piles",
		steps: 600,
		setup (a, rand) {
			arena(a);
			const boxes = [];
			for (let i = 0; i < 1000; i++) {
				const column = i % 25, layer = Math.floor(i / 25);
				const x = ((column % 5) - 2) * 1.6 + (rand() - 0.5) * 0.3;
				const z = (Math.floor(column / 5) - 2) * 1.6 + (rand() - 0.5) * 0.3;
				const h = 0.15 + rand() * 0.2;
				boxes.push(a.addDynamicBox(x + 4, 0.5 + layer * 0.9, z + 4, h, h * (0.6 + rand() * 0.6), h));
			}
			return { boxes };
		},
		check (a, state) {
			let lost = 0, sumY = 0;
			for (const box of state.boxes) {
				const y = a.position(box).y;
				if (!(y > -0.1)) lost++;
				else sumY += y;
			}
			return { meanY: +(sumY / Math.max(1, state.boxes.length - lost)).toFixed(3), lost };
		}
	},
	ragdolls: {
		label: "Ragdolls: 100 ragdolls (11 bodies, 10 joints each) dropped in a heap",
		steps: 600,
		setup (a, rand) {
			arena(a);
			const pelvises = [];
			for (let i = 0; i < 100; i++) {
				const x = ((i % 10) - 4.5) * 1.2, z = (Math.floor(i / 10) - 4.5) * 0.8;
				const parts = a.addRagdoll(x + rand() * 0.2, 0.5 + (i % 4) * 1.9, z + 6, RAGDOLL);
				pelvises.push(parts[0]);
			}
			return { pelvises };
		},
		check (a, state) {
			let lost = 0, sumY = 0;
			for (const pelvis of state.pelvises) {
				const y = a.position(pelvis).y;
				if (!(y > -0.1)) lost++;
				else sumY += y;
			}
			return { pelvisMeanY: +(sumY / Math.max(1, state.pelvises.length - lost)).toFixed(3), lost };
		}
	},
	raycasts: {
		label: "Raycasts: 2000 rays per step through the 500-zombie horde",
		steps: 300,
		...horde(500),
		rays: 2000
	}
};
