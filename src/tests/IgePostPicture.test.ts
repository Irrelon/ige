import { IGE_POST_PROCESS_DEFAULTS, igePictureEffectsOn, IgeWebGlPostProcess } from "@/engine/webgl/IgeWebGlPostProcess";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";

/** Numbers as the GPU keeps them (32-bit floats: the device sends uniforms from a Float32Array). */
const f32 = (v: number[]) => v.map(Math.fround);

/** The device on a stand-in WebGL 2 context that records the uniforms set (by name). */
function recordingGl () {
	let n = 0;
	const uniforms = new Map<string, number[]>();
	const gl = new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) return 1;
			if (prop === "checkFramebufferStatus") return () => 1;
			if (prop === "getExtension") return () => ({});
			if (prop === "getParameter") return () => 4;
			if (prop === "getShaderParameter" || prop === "getProgramParameter") return () => true;
			if (prop === "getUniformLocation") return (_p: unknown, name: string) => name;
			if (prop.startsWith("uniform")) return (loc: string, ...v: number[]) => uniforms.set(loc, v);
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return () => undefined;
		}
	}) as unknown as WebGL2RenderingContext;
	return { gl: new IgeWebGl2GpuDevice(gl), uniforms };
}

describe("post-processing: the picture moved, turned, zoomed, softened and doubled", () => {
	it("knows when a picture effect's set (and that the defaults set none)", () => {
		expect(igePictureEffectsOn(IGE_POST_PROCESS_DEFAULTS)).toBe(false);
		for (const set of [{ offsetX: 0.01 }, { offsetY: -0.01 }, { rotation: 0.02 }, { zoom: 1.05 }, { blur: 0.001 }, { ghost: 0.3 }]) {
			expect(igePictureEffectsOn({ ...IGE_POST_PROCESS_DEFAULTS, ...set })).toBe(true);
		}
	});

	it("runs with post-processing off while a picture effect's set, and then only that: no bloom, tone mapping or grading", () => {
		const { gl, uniforms } = recordingGl();
		const post = new IgeWebGlPostProcess(gl, { enabled: false, bloom: 0.8, exposure: 1.4, toneMapping: "aces", saturation: 0.5, vignette: 0.6 });
		expect(post.begin(1280, 720)).toBe(false);
		post.settings = { ...post.settings, offsetX: 0.01, offsetY: 0.02, rotation: 0.03, zoom: 1.05, blur: 0.002 };
		expect(post.begin(1280, 720)).toBe(true);
		post.end();
		expect(uniforms.get("u_bloom")).toEqual(f32([0]));
		expect(uniforms.get("u_exposure")).toEqual(f32([1]));
		expect(uniforms.get("u_tone")).toEqual(f32([0]));
		expect(uniforms.get("u_saturation")).toEqual(f32([1]));
		expect(uniforms.get("u_vignette")).toEqual(f32([0]));
		// Screen terms (y down, clockwise) to the shader's (y up)
		expect(uniforms.get("u_offset")).toEqual(f32([0.01, -0.02]));
		expect(uniforms.get("u_rotation")).toEqual(f32([-0.03]));
		expect(uniforms.get("u_zoom")).toEqual(f32([1.05]));
		expect(uniforms.get("u_blur")).toEqual(f32([0.002]));
	});

	it("with post-processing on, adds the picture's effects to the rest; set back to none, the picture's still", () => {
		const { gl, uniforms } = recordingGl();
		const post = new IgeWebGlPostProcess(gl, { enabled: true, exposure: 1.2, ghost: 0.4, ghostX: 0.004, ghostY: 0, ghostColor: { r: 1, g: 0.85, b: 0.8 } });
		expect(post.begin(800, 600)).toBe(true);
		post.end();
		expect(uniforms.get("u_exposure")).toEqual(f32([1.2]));
		expect(uniforms.get("u_ghost")).toEqual(f32([0.4]));
		expect(uniforms.get("u_ghostShift")).toEqual(f32([0.004, -0]));
		expect(uniforms.get("u_ghostColor")).toEqual(f32([1, 0.85, 0.8]));
		post.settings = { ...post.settings, ghost: 0 };
		expect(post.begin(800, 600)).toBe(true);
		post.end();
		expect(uniforms.get("u_offset")).toEqual(f32([0, -0]));
		expect(uniforms.get("u_rotation")).toEqual(f32([-0]));
		expect(uniforms.get("u_zoom")).toEqual(f32([1]));
		expect(uniforms.get("u_ghost")).toEqual(f32([0]));
	});
});
