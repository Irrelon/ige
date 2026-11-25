/**
 * Decals and particles added after their systems have updated in a frame (the driving spike's skid marks and tyre
 * smoke, added after the physics step): the renderer must never draw more instances than it uploaded, or GL fails the
 * draw ("Vertex buffer is not big enough") and the frame's marks are lost.
 */
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { DECAL_INSTANCE_FLOATS, IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { IgeParticleSystem3d, PARTICLE_INSTANCE_FLOATS } from "@/engine/webgl/IgeParticleSystem3d";

/** A device that keeps what each buffer holds, as a streamed buffer does: new storage the size of each write. */
function recordingDevice () {
	const bytes = new Map<object, number>();
	return {
		bytes,
		createBuffer: () => {
			const b = {};
			bytes.set(b, 0);
			return b;
		},
		writeBuffer: (b: object, offset: number, data: ArrayBufferView) => {
			expect(offset).toBe(0);
			bytes.set(b, data.byteLength);
		},
		destroyBuffer: () => undefined
	};
}

/** The renderer's own upload and draw-selection code, on a stand-in with that device and a view that sees everything. */
function rendererWith (device: ReturnType<typeof recordingDevice>) {
	const r = Object.create(IgeWebGlRenderer.prototype) as any;
	r._device = device;
	r._particleBuffers = new Map();
	r._frameId = 1;
	r._textureManager = undefined;
	const sees = { frustum: { containsSphereXYZ: () => true } };
	return {
		r,
		/** Collect (upload) then pick what's drawn: the instance counts asked of each buffer, with the bytes it holds. */
		frame (decals: IgeDecalSystem3d[], particles: IgeParticleSystem3d[]) {
			r._frameId++;
			for (const p of particles) r._uploadInstanceData(p, PARTICLE_INSTANCE_FLOATS);
			for (const d of decals) r._uploadInstanceData(d, DECAL_INSTANCE_FLOATS);
			const draws: { count: number; floats: number; held: number }[] = [];
			for (const q of r._visibleDecals(decals, sees).quads) {
				draws.push({ count: q.count, floats: DECAL_INSTANCE_FLOATS, held: device.bytes.get(r._particleBuffers.get(q.system).buffer)! });
			}
			for (const p of r._visibleParticles(particles, sees)) {
				draws.push({ count: p.count, floats: PARTICLE_INSTANCE_FLOATS, held: device.bytes.get(r._particleBuffers.get(p.system).buffer)! });
			}
			return draws;
		}
	};
}

describe("Decals and particles added after their update", () => {
	it("decals: renderData() packs what was added since update(), so its count never runs ahead of its data", () => {
		const decals = new IgeDecalSystem3d({ maxDecals: 1000, lift: 0 });
		decals.add(1, 1, { rotation: 0 });
		decals._age(0.016); // what update() does each frame
		const version = decals._renderVersion;
		// The physics has stepped: this frame's marks go in after the system's update
		for (let i = 0; i < 400; i++) decals.add(i * 2, -i, { rotation: 0, cell: 0 });
		const { data, count } = decals.renderData();
		expect(count).toBe(401);
		expect(decals._renderVersion).toBe(version + 1);
		// Every row is a decal that was added, in order (oldest first)
		expect(data[0]).toBe(1);
		for (let i = 0; i < 400; i++) {
			expect(data[(i + 1) * DECAL_INSTANCE_FLOATS]).toBe(i * 2);
			expect(data[(i + 1) * DECAL_INSTANCE_FLOATS + 2]).toBe(-i);
		}
		// Packed once: asking again changes nothing
		decals.renderData();
		expect(decals._renderVersion).toBe(version + 1);
	});

	it("particles: renderData() packs a burst made after update()", () => {
		const smoke = new IgeParticleSystem3d({ maxParticles: 2000, lifetime: [5, 5], speed: [0, 0], size: [3, 3], emitterRadius: 0 });
		smoke.burst(10, { x: 0, y: 0, z: 0 });
		smoke._simulate(0.016);
		const version = smoke._renderVersion;
		smoke.burst(300, { x: 50, y: 7, z: -20 });
		const { data, count } = smoke.renderData();
		expect(count).toBe(310);
		expect(smoke._renderVersion).toBe(version + 1);
		// The new particles are where they were made, at their starting size
		for (let i = 10; i < 310; i++) {
			const o = i * PARTICLE_INSTANCE_FLOATS;
			expect([data[o], data[o + 1], data[o + 2], data[o + 3]]).toEqual([50, 7, -20, 3]);
		}
	});

	it("projected decals: meshRenderData() packs ones projected since update()", () => {
		const decals = new IgeDecalSystem3d();
		decals._age(0.016); // what update() does each frame
		const before = decals._meshRenderVersion;
		decals._projected.push({ vertices: new Float32Array(15), r: 1, g: 0, b: 0, opacity: 1, age: 0 });
		decals._meshDirty = true;
		expect(decals.meshRenderData().vertexCount).toBe(3);
		expect(decals._meshRenderVersion).toBe(before + 1);
	});

	it("the renderer draws only what it uploaded, frame after frame of hundreds of marks and bursts", () => {
		const device = recordingDevice();
		const { frame } = rendererWith(device);
		// Marks that last (no fading, so a quiet frame's update packs nothing) and short-lived smoke (idle between skids)
		const marks = new IgeDecalSystem3d({ maxDecals: 3000, lifetime: 30 });
		const smoke = new IgeParticleSystem3d({ maxParticles: 700, lifetime: [0.02, 0.05], speed: [10, 40] });
		let drawn = 0;
		for (let f = 0; f < 120; f++) {
			// The engine's update: the systems age and pack
			marks._age(0.016);
			smoke._simulate(0.016);
			// Then the game adds this frame's marks and smoke (after the physics), before the frame is drawn: skids
			// start and stop, so some frames add nothing and the next adds hundreds
			if (f % 3 === 0) for (let i = 0; i < 300; i++) marks.add(Math.random() * 100, Math.random() * 100, { size: 5 });
			if (f % 5 === 1) for (let b = 0; b < 40; b++) smoke.burst(8, { x: b, y: 0, z: 0 });
			for (const d of frame([marks], [smoke])) {
				expect(d.count * d.floats * 4).toBeLessThanOrEqual(d.held);
				drawn += d.count;
			}
		}
		expect(drawn).toBeGreaterThan(0);
	});

	it("a system emptied by clear() draws nothing", () => {
		const device = recordingDevice();
		const { frame } = rendererWith(device);
		const marks = new IgeDecalSystem3d();
		marks.add(0, 0);
		expect(frame([marks], []).length).toBe(1);
		marks.clear();
		expect(frame([marks], [])).toEqual([]);
	});
});
