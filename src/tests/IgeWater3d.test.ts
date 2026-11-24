import { IgeWater3d } from "@/engine/physics/IgeWater3d";

/*
 * The shared water: one function of position and time that buoyancy, the
 * drawn sea, servers and clients all agree on. No physics engine needed.
 * IGE units are centimetres here.
 */

const SEA = {
	level: 50,
	waves: [
		{ direction: 20, length: 4000, amplitude: 30, steepness: 0.5 },
		{ direction: 75, length: 1500, amplitude: 10, steepness: 0.6, phase: 1 },
		{ direction: -40, length: 900, amplitude: 5, steepness: 0.3, phase: 2 }
	]
};

describe("IgeWater3d", () => {
	it("is flat at its level without waves, and absent outside its regions", () => {
		const water = new IgeWater3d({ level: 120 });
		expect(water.heightAt(0, 0)).toBe(120);
		expect(water.heightAt(-50000, 99999, 12.5)).toBe(120);
		expect(water.normalAt(10, 10)).toEqual({ x: 0, y: 1, z: 0 });
		expect(water.density).toBe(1025);

		const harbour = new IgeWater3d({
			level: 0,
			waves: [{ direction: 0, length: 2000, amplitude: 40 }],
			regions: [
				{ minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000, waves: 0, current: { x: 0, z: 50 } }, // a calm dock
				{ minX: -10000, maxX: 10000, minZ: -10000, maxZ: 10000 }, // the open sea
				{ minX: 20000, maxX: 30000, minZ: 0, maxZ: 10000, level: 3000 } // a lake up the hill
			]
		});
		expect(harbour.heightAt(0, 0, 3)).toBe(0);
		expect(harbour.currentAt(0, 0)).toEqual({ x: 0, z: 50 });
		expect(harbour.heightAt(5000, 0, 3)).not.toBe(0);
		expect(harbour.heightAt(25000, 5000)).toBeGreaterThan(2900);
		expect(harbour.heightAt(50000, 0)).toBe(-Infinity);
		expect(harbour.inWater(50000, 0)).toBe(false);
		expect(harbour.currentAt(50000, 0)).toEqual({ x: 0, z: 0 });
		expect(harbour.maxHeight()).toBeCloseTo(3040, 6);
	});

	it("gives the same heights on every machine from the same options and clock", () => {
		const a = new IgeWater3d(SEA);
		const b = new IgeWater3d(JSON.parse(JSON.stringify(a.options())));
		a.time(123.25);
		b.time(123.25);
		for (let i = 0; i < 50; i++) {
			const x = Math.sin(i) * 20000, z = Math.cos(i * 1.7) * 20000;
			expect(b.heightAt(x, z)).toBe(a.heightAt(x, z));
		}
		// The physics clock moves on by steps
		a._advance(1 / 60);
		expect(a.time()).toBeCloseTo(123.25 + 1 / 60, 12);
	});

	it("draws the surface it reports: each rest point's surface point is at heightAt", () => {
		const water = new IgeWater3d(SEA);
		const position = { x: 0, y: 0, z: 0 }, normal = { x: 0, y: 0, z: 0 };
		const total = SEA.waves.reduce((sum, w) => sum + w.amplitude, 0);
		for (let i = 0; i < 200; i++) {
			const x0 = (i % 20) * 173 - 1700, z0 = Math.floor(i / 20) * 311 - 1500, t = i * 0.37;
			water.surfaceAt(x0, z0, t, position, normal);
			// Steep waves sway: the surface point isn't over its rest point...
			expect(Math.abs(position.y - SEA.level)).toBeLessThanOrEqual(total + 1e-9);
			// ...but heightAt() finds it
			expect(water.heightAt(position.x, position.z, t)).toBeCloseTo(position.y, 0);
			expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 9);
			expect(normal.y).toBeGreaterThan(0.5);
			// The analytic normal and the one from heights agree
			const n = water.normalAt(position.x, position.z, t);
			expect(n.x * normal.x + n.y * normal.y + n.z * normal.z).toBeGreaterThan(0.99);
		}
	});

	it("moves its crests along at the waves' speed (deep water's by default)", () => {
		// One wave along +Z, 40 m long: deep water carries it at about 7.9 m/s
		const water = new IgeWater3d({ waves: [{ direction: 0, length: 4000, amplitude: 50, steepness: 0 }] });
		const crest = (t: number) => {
			let best = 0, bestZ = 0;
			for (let z = 0; z < 4000; z += 5) {
				const y = water.heightAt(0, z, t);
				if (y > best) { best = y; bestZ = z; }
			}
			return bestZ;
		};
		const speed = Math.sqrt((9.81 * 40) / (2 * Math.PI)) * 100;
		expect(crest(2) - crest(0)).toBeCloseTo(speed * 2, -1);
		expect(water.heightAt(0, 1000, 0)).toBeCloseTo(50, 6); // a quarter wave in: the crest at t = 0

		const slow = new IgeWater3d({ waves: [{ direction: 90, length: 4000, amplitude: 50, steepness: 0, speed: 100 }] });
		expect(slow.heightAt(1100, 0, 1)).toBeCloseTo(50, 6); // along +X at 1 m/s
	});
});
