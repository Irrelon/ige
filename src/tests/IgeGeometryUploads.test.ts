import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { IgeWebGlGeometryManager } from "@/engine/webgl/IgeWebGlGeometryManager";
import { quantiseGeometry } from "@/engine/webgl/IgeVertexPacking";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** A stand-in WebGL 2 context: every constant is 1, every create* hands back a new token. */
function mockGl (): WebGL2RenderingContext {
	let n = 0;
	return new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) return 1;
			if (prop === "getExtension") return () => ({});
			if (prop === "getParameter") return () => 4096;
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return () => undefined;
		}
	}) as unknown as WebGL2RenderingContext;
}

/** A renderer with only what uploading needs: a geometry manager on a stand-in device. */
function renderer (): any {
	const r = Object.create(IgeWebGlRenderer.prototype) as any;
	const gl = mockGl();
	// (The renderer's device: gpuMemory() counts its buffers)
	r._device = new IgeWebGl2GpuDevice(gl);
	r._geometryManager = new IgeWebGlGeometryManager(gl, {} as any, r._device);
	r._gpuOnlyGeometry = new Set();
	r._stats = {};
	return r;
}

/** A chunk-sized mesh: `n` vertices of floats (32 bytes each as uploaded). */
function mesh (id: string, n = 1000): IgeGeometryData3d {
	return {
		id,
		vertices: new Float32Array(n * 3).map((_, i) => i % 97),
		normals: new Float32Array(n * 3).fill(0.5),
		uvs: new Float32Array(n * 2).fill(0.25),
		indices: new Uint16Array(n).map((_, i) => i)
	};
}

describe("the renderer's upload budget", () => {
	it("uploads as meshes are first drawn when there's no budget (as before)", () => {
		const r = renderer();
		const before = r.gpuMemory().geometry; // the sprites' shared quad
		for (let i = 0; i < 5; i++) expect(r._getGeometry(mesh(`m${i}`))).toBeTruthy();
		r._endUploadFrame();
		expect(r._stats.uploads).toBe(5);
		expect(r._stats.uploadBytes).toBe(5 * (1000 * 32 + 2000));
		expect(r.stats().gpuMemory.geometry - before).toBe(5 * (1000 * 32 + 2000));
		expect(r._stats.uploadsQueued).toBe(0);
	});

	it("holds meshes over the budget back to the next frames, freeing arrays and calling uploads off as asked", async () => {
		const r = renderer();
		r.uploadBudget({ bytes: 70_000, ms: 0 }); // two of these meshes a frame
		expect(r.uploadBudget()).toEqual({ bytes: 70_000, ms: Infinity });
		const meshes = [0, 1, 2, 3, 4].map((i) => mesh(`chunk${i}`));
		const drawn = meshes.map((m) => !!r._getGeometry(m));
		expect(drawn).toEqual([true, true, false, false, false]);
		// Waiting: its arrays go once it's up; another is released before its turn
		expect(r.discardGeometryArrays(meshes[2])).toBe(true);
		expect(meshes[2].vertices).toBeDefined();
		const released = r.uploadGeometry(meshes[3]);
		r.releaseGeometry(meshes[3]);
		await expect(released).resolves.toBe(false);
		r._endUploadFrame(); // frame 1 reported; frame 2's budget starts with the waiting ones
		expect(r._stats.uploads).toBe(2);
		expect(r._stats.uploadsQueued).toBe(0);
		expect(r.geometryUploaded(meshes[2])).toBe(true);
		expect(r.geometryUploaded(meshes[3])).toBe(false);
		expect(r.geometryUploaded(meshes[4])).toBe(true);
		expect(meshes[2].vertices).toBeUndefined();
		expect(meshes[2].gpuOnly).toBe(true);
		expect(meshes[2].boundingBox).toBeDefined();
	});

	it("resolves uploadGeometry() once the mesh is up, lower priorities first", async () => {
		const r = renderer();
		r.uploadBudget({ bytes: 1, ms: 0 });
		r._getGeometry(mesh("first")); // the frame's first goes
		const order: string[] = [];
		const far = r.uploadGeometry(mesh("far"), { priority: 300 }).then(() => order.push("far"));
		const near = r.uploadGeometry(mesh("near"), { priority: 10, discardArrays: true }).then(() => order.push("near"));
		r._endUploadFrame();
		r._endUploadFrame();
		await Promise.all([far, near]);
		expect(order).toEqual(["near", "far"]);
	});

	it("draws a quantised mesh with its decode in the world matrix and texture transform", () => {
		const r = renderer();
		const m = mesh("tiled");
		m.uvs = m.uvs!.map((_, i) => (i % 2 ? 40 : -3) * (i % 4 < 2 ? 1 : 0)); // 0 to 40, -3 to 0: outside 0-1
		const g = r._getGeometry(quantiseGeometry(m));
		const world = new Float32Array([2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 100, 0, 50, 1]);
		const drawn = r._drawWorld({ worldMatrix: world }, g);
		const d = g.positionDecode;
		// world × decode: the decode's scale doubled, its offset moved and doubled
		expect(drawn[0]).toBeCloseTo(2 * d[0]);
		expect(drawn[12]).toBeCloseTo(2 * d[12] + 100);
		expect(drawn[14]).toBeCloseTo(2 * d[14] + 50);
		const block = new Float32Array(4);
		r._writeUvTransform(block, 0, { uvScaleU: 0.5, uvScaleV: 1, uvOffsetU: 0.1, uvOffsetV: 0 }, g);
		const [su, , ou] = g.uvDecode;
		expect(block[0]).toBeCloseTo(su * 0.5);
		expect(block[2]).toBeCloseTo(ou * 0.5 + 0.1);
		// A float mesh draws with its world matrix as it is
		expect(r._drawWorld({ worldMatrix: world }, r._getGeometry(mesh("plain")))).toBe(world);
	});
});
