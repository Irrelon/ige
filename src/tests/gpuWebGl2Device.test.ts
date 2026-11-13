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

	it("a stencil-marking pipeline writes no colour, tests equal to the pass's reference and increments where it passes", () => {
		const { d, calls, take, quad } = setUp();
		const mark = d.createRenderPipeline({
			module: d.createShaderModule({ vertex: VS, fragment: FS }),
			vertex: { buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }] }] },
			writeColor: false,
			stencil: { compare: "equal", passOp: "increment-clamp" }
		});
		take();
		const pass = d.beginRenderPass({ color: { target: d.surface() } });
		pass.setPipeline(mark);
		pass.setVertexBuffer(0, quad);
		pass.setStencilReference(2);
		pass.draw(3);
		const sent = Object.fromEntries(calls.map(([k, a]) => [k, a]));
		expect(sent.colorMask).toEqual([false, false, false, false]);
		// (GL's EQUAL, the reference, all bits; KEEP, KEEP, INCR)
		expect(sent.stencilFunc).toEqual([0x0202, 2, 0xff]);
		expect(sent.stencilOp).toEqual([0x1e00, 0x1e00, 0x1e02]);
		expect(calls[calls.length - 1][0]).toBe("drawArrays");
	});

	it("acts on a texture through the scratch unit made active, though it was bound there already (a draw's unit active since)", () => {
		const { d, calls, take, quad, inst, pipeline } = setUp();
		const image = d.createTexture({ width: 4, height: 4, format: "rgba8unorm" });
		const tex = d.createTexture({ width: 8, height: 8, format: "rgba8unorm" });
		d.generateMipmaps(tex);
		take();
		// A draw: its texture slot's unit (0) made active
		const pass = d.beginRenderPass({ color: { target: d.surface() } });
		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, quad);
		pass.setVertexBuffer(1, inst);
		pass.setTexture(0, image);
		pass.draw(4, 1);
		take();
		// The same texture's mips again: the scratch unit active before generateMipmap, though it's bound there still
		d.generateMipmaps(tex);
		expect(calls.map(([k]) => k)).toEqual(["activeTexture", "generateMipmap"]);
	});

	it("draws a depth-only pass into a depth texture's own framebuffer (no colour buffers), made once and cleared", () => {
		const { d, calls, take } = setUp();
		const depth = d.createTexture({ width: 512, height: 512, format: "depth32float", sampler: { minFilter: "nearest", magFilter: "nearest" } });
		take();
		d.beginRenderPass({ depthStencil: { target: depth, depthLoadOp: "clear", depthClearValue: 1 } }).end();
		const first = take();
		expect(first).toEqual(expect.arrayContaining(["createFramebuffer", "framebufferTexture2D", "drawBuffers", "readBuffer", "clear"]));
		expect(calls.length).toBe(0);
		d.beginRenderPass({ depthStencil: { target: depth } }).end();
		expect(take()).not.toContain("createFramebuffer");
	});

	it("keeps a framebuffer for each depth texture a colour texture is drawn with, and one for it alone", () => {
		const { d, take } = setUp();
		const colour = d.createTexture({ width: 64, height: 64, format: "r32float" });
		const depthA = d.createTexture({ width: 64, height: 64, format: "depth16unorm" });
		const depthB = d.createTexture({ width: 64, height: 64, format: "depth16unorm" });
		take();
		const made = (desc: Parameters<typeof d.beginRenderPass>[0]) => {
			d.beginRenderPass(desc).end();
			return take().filter((c) => c === "createFramebuffer").length;
		};
		expect(made({ color: { target: colour }, depthStencil: { target: depthA } })).toBe(1);
		expect(made({ color: { target: colour }, depthStencil: { target: depthB } })).toBe(1);
		expect(made({ color: { target: colour } })).toBe(1);
		expect(made({ color: { target: colour }, depthStencil: { target: depthA } })).toBe(0);
		// (Its depth gone: the framebuffer with it too)
		d.destroyTexture(depthA);
		expect(take().filter((c) => c === "deleteFramebuffer").length).toBe(1);
	});

	it("makes a multisampled texture a renderbuffer; resolves it with a blit, the scissor off; copies depth as depth", () => {
		const { d, calls, take } = setUp();
		const msaa = d.createTexture({ width: 320, height: 200, format: "rgba8unorm", sampleCount: 4 });
		expect(calls.map(([k]) => k)).toEqual(["createRenderbuffer", "bindRenderbuffer", "renderbufferStorageMultisample", "bindRenderbuffer"]);
		expect(calls[2][1][1]).toBe(4);
		const scene = d.createTexture({ width: 320, height: 200, format: "rgba8unorm" });
		take();
		d.resolveTexture(msaa, scene);
		const blit = calls.find(([k]) => k === "blitFramebuffer")!;
		expect(blit[1].slice(0, 8)).toEqual([0, 0, 320, 200, 0, 0, 320, 200]);
		expect(calls.map(([k]) => k)).toContain("framebufferRenderbuffer");
		take();
		const a = d.createTexture({ width: 16, height: 16, format: "depth32float" });
		const b = d.createTexture({ width: 16, height: 16, format: "depth32float" });
		take();
		d.copyTextureToTexture(a, b);
		const depthBlit = calls.find(([k]) => k === "blitFramebuffer")!;
		const colourBlit = blit[1][8];
		expect(depthBlit[1][8]).not.toBe(colourBlit);
	});

	it("reads a rectangle of a target back from its framebuffer", () => {
		const { d, calls, take } = setUp();
		const tex = d.createTexture({ width: 8, height: 8, format: "rgba8unorm" });
		take();
		const px = d.readTarget(tex, [1, 2, 3, 4]);
		expect(px.length).toBe(3 * 4 * 4);
		const read = calls.find(([k]) => k === "readPixels")!;
		expect(read[1].slice(0, 4)).toEqual([1, 2, 3, 4]);
		expect(read[1][6]).toBe(px);
	});

	it("binds a GLSL ES 1.00 module's attributes to the locations it names before linking", () => {
		const { d, take } = setUp();
		d.createShaderModule({ vertex: "attribute vec3 a_position; void main() {}", fragment: "void main() {}", attributes: { a_position: 0, a_normal: 1 } });
		const sent = take();
		expect(sent.filter((c) => c === "bindAttribLocation").length).toBe(2);
		expect(sent.indexOf("bindAttribLocation")).toBeLessThan(sent.indexOf("linkProgram"));
	});

	it("after a lost context, makes each resource again as it's next used: its program and uniforms, vertex array, buffers and textures", () => {
		const { d, take, quad, inst, pipeline, calls } = setUp();
		const tex = d.createTexture({ width: 4, height: 4, format: "rgba8unorm" });
		const draw = () => {
			const pass = d.beginRenderPass({ color: { target: d.surface() } });
			pass.setPipeline(pipeline);
			pass.setVertexBuffer(0, quad);
			pass.setVertexBuffer(1, inst);
			pass.setTexture(0, tex);
			pass.setUniforms([800, 600, 1]);
			pass.draw(4, 2);
		};
		draw();
		take();
		d.lost = true;
		d.restore();
		draw();
		const again = take();
		for (const made of ["createProgram", "linkProgram", "createVertexArray", "createBuffer", "createTexture", "texImage2D", "uniform2f", "uniform1f"]) expect(again).toContain(made);
		// (Once: then as before)
		draw();
		expect(take()).toEqual(["drawArraysInstanced"]);
		expect(calls.length).toBe(0);
		// (A second restore with no loss between does nothing)
		d.restore();
		draw();
		expect(take()).toEqual(["drawArraysInstanced"]);
	});
});
