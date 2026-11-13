/**
 * IgeGpuDevice on WebGL2 (IgeWebGl2GpuDevice), against a GL that records its calls: a pipeline's state sent once, an
 * instanced draw's attributes pointed again only when its first instance moves, uniforms sent as they change, a
 * render target's framebuffer made once, a cleared rectangle scissored, a streamed buffer given new storage.
 */
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";

/** A WebGL2 context that records each call (name and arguments); its constants are distinct numbers. */
function fakeGl (): { gl: WebGL2RenderingContext; calls: [string, unknown[]][]; take: () => string[] } {
	const calls: [string, unknown[]][] = [];
	const consts = new Map<string, number>();
	let next = 1;
	const target: Record<string, unknown> = {
		drawingBufferWidth: 800,
		drawingBufferHeight: 600,
		getParameter: (p: number) => (p === consts.get("MAX_COMBINED_TEXTURE_IMAGE_UNITS") ? 32 : 4096),
		getContextAttributes: () => ({ stencil: true }),
		getShaderParameter: () => true,
		getProgramParameter: () => true,
		getUniformLocation: (_p: unknown, name: string) => ({ name })
	};
	const gl = new Proxy(target, {
		get (t, key: string) {
			if (key in t) {
				const v = t[key];
				return typeof v === "function" ? (...a: unknown[]) => {
					calls.push([key, a]);
					return (v as (...x: unknown[]) => unknown)(...a);
				} : v;
			}
			if (/^[A-Z0-9_]+$/.test(key)) {
				if (!consts.has(key)) consts.set(key, next++);
				return consts.get(key);
			}
			return (...a: unknown[]) => {
				calls.push([key, a]);
				return key.startsWith("create") ? { made: key } : undefined;
			};
		}
	}) as unknown as WebGL2RenderingContext;
	const take = () => calls.splice(0).map(([k]) => k);
	return { gl, calls, take };
}

const VS = "#version 300 es\nlayout(location=0) in vec2 a_corner;\nlayout(location=1) in vec4 a_rect;\nvoid main() {}";
const FS = "#version 300 es\nprecision highp float;\nout vec4 o;\nvoid main() { o = vec4(0.0); }";

function setUp () {
	const f = fakeGl();
	const d = new IgeWebGl2GpuDevice(f.gl);
	const module = d.createShaderModule({ vertex: VS, fragment: FS });
	const quad = d.createBuffer({ size: 32, usage: "vertex" });
	const inst = d.createBuffer({ size: 0, usage: "vertex", stream: true });
	const pipeline = d.createRenderPipeline({
		module,
		vertex: { buffers: [
			{ arrayStride: 8, attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }] },
			{ arrayStride: 16, stepMode: "instance", attributes: [{ shaderLocation: 1, format: "float32x4", offset: 0 }] }
		] },
		primitive: { topology: "triangle-strip" },
		blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } },
		uniforms: [{ name: "u_resolution", type: "vec2" }, { name: "u_scale", type: "f32" }],
		textures: [{ name: "u_image" }]
	});
	f.take();
	return { ...f, d, quad, inst, pipeline };
}

describe("IgeGpuDevice: WebGL2", () => {
	it("sends a pipeline's state once; a second draw sends the draw, its instances pointed again only when they move", () => {
		const { d, take, quad, inst, pipeline, calls } = setUp();
		const pass = d.beginRenderPass({ color: { target: d.surface() } });
		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, quad);
		pass.setVertexBuffer(1, inst);
		pass.setUniforms([800, 600, 1]);
		pass.draw(4, 10, 0, 0);
		const first = take();
		// (Its program's in use already: its texture slots were given their units as it was made)
		expect(first).toContain("blendFunc");
		expect(first.filter((c) => c === "vertexAttribPointer")).toHaveLength(2);
		expect(first[first.length - 1]).toBe("drawArraysInstanced");
		// The same again: just the draw
		pass.draw(4, 10, 0, 0);
		expect(take()).toEqual(["drawArraysInstanced"]);
		// From instance 10: the instance attribute pointed 160 bytes on (its buffer bound still), nothing else
		pass.draw(4, 5, 0, 10);
		const moved = calls.slice();
		expect(take()).toEqual(["vertexAttribPointer", "drawArraysInstanced"]);
		expect(moved[0][1]).toEqual([1, 4, expect.any(Number), false, 16, 160]);
		pass.end();
	});

	it("sends a uniform only when it changes", () => {
		const { d, take, quad, inst, pipeline } = setUp();
		const pass = d.beginRenderPass({ color: { target: d.surface() } });
		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, quad);
		pass.setVertexBuffer(1, inst);
		pass.setUniforms([800, 600, 1]);
		pass.draw(4, 1);
		expect(take().filter((c) => c.startsWith("uniform"))).toEqual(["uniform2f", "uniform1f"]);
		pass.setUniforms([800, 600, 2]);
		pass.draw(4, 1);
		expect(take().filter((c) => c.startsWith("uniform"))).toEqual(["uniform1f"]);
		pass.setUniforms(new Float32Array([800, 600, 2]));
		pass.draw(4, 1);
		expect(take().filter((c) => c.startsWith("uniform"))).toEqual([]);
	});

	it("draws into a texture through a framebuffer made once; clears a rectangle of it through the scissor", () => {
		const { d, take } = setUp();
		const tex = d.createTexture({ width: 64, height: 32, format: "rgba8unorm" });
		take();
		d.beginRenderPass({ color: { target: tex, loadOp: "clear", clearValue: [0, 0, 0, 0] } }).end();
		const made = take();
		expect(made.filter((c) => c === "createFramebuffer")).toHaveLength(1);
		expect(made).toContain("framebufferTexture2D");
		expect(made[made.length - 1]).toBe("clear");
		d.beginRenderPass({ color: { target: d.surface() } }).end();
		const pass = d.beginRenderPass({ color: { target: tex } });
		expect(take()).toEqual(["bindFramebuffer", "bindFramebuffer"]);
		pass.clear([0, 0, 0, 0], [0, 0, 10, 10]);
		expect(take()).toEqual(["enable", "scissor", "clear"]);
	});

	it("gives a streamed buffer new storage as it's written whole; a fixed one written in place, never past its end", () => {
		const { d, take, inst, quad } = setUp();
		d.writeBuffer(inst, 0, new Float32Array(100));
		expect(take()).toEqual(["bindBuffer", "bufferData"]);
		expect(inst.size).toBe(400);
		d.writeBuffer(quad, 0, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));
		expect(take()).toEqual(["bindBuffer", "bufferSubData"]);
		expect(() => d.writeBuffer(quad, 16, new Float32Array(8))).toThrow(/past the end/);
	});

	it("sends everything again after invalidate (another renderer used the context)", () => {
		const { d, take, quad, inst, pipeline } = setUp();
		const draw = () => {
			const pass = d.beginRenderPass({ color: { target: d.surface() } });
			pass.setPipeline(pipeline);
			pass.setVertexBuffer(0, quad);
			pass.setVertexBuffer(1, inst);
			pass.setUniforms([800, 600, 1]);
			pass.draw(4, 1);
			pass.end();
		};
		draw();
		take();
		draw();
		expect(take()).toEqual(["drawArraysInstanced"]);
		d.invalidate();
		draw();
		const again = take();
		expect(again).toContain("bindFramebuffer");
		expect(again).toContain("useProgram");
		expect(again).toContain("blendFunc");
		// (Uniforms are the program's own: kept)
		expect(again.filter((c) => c.startsWith("uniform"))).toEqual([]);
	});
});
