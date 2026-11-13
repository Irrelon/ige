/**
 * The 3D renderer's meshes on IgeGpuDevice: the shader library's programs as device shader modules (their GLSL ES 1.00
 * attributes bound to fixed locations), each mesh's vertex layout, the instance buffer's, and the pipelines made from
 * them, kept by what they're made of.
 */
import type {
	IgeGpuDevice, IgeGpuRenderPipeline, IgeGpuRenderPipelineDesc, IgeGpuShaderModule, IgeGpuVertexBufferLayout, IgeGpuVertexFormat
} from "@/engine/gpu/IgeGpuDevice";
import { IgeShaderLibrary } from "@/engine/shaders/webgl/shaderLibrary";
import type { IgeWebGlGeometry } from "@/engine/webgl/IgeWebGlGeometry";

/** Where the mesh shaders' vertex inputs are, by name: a mesh's own, then its instance's (IgeWebGlInstanceBuffer). */
export const MESH_ATTRIBUTES: Readonly<Record<string, number>> = {
	a_position: 0,
	a_normal: 1,
	a_uv: 2,
	a_color: 3,
	a_boneWeights: 4,
	a_boneIndices: 5,
	a_tangent: 6,
	a_instanceMatrix0: 7,
	a_instanceMatrix1: 8,
	a_instanceMatrix2: 9,
	a_instanceMatrix3: 10,
	a_instanceColor: 11,
	a_instanceEmissive: 12,
	a_instanceMaterial: 13
};

/** The instance buffer's layout: a world matrix's columns, colour, emissive, material (28 floats an instance). */
export const INSTANCE_LAYOUT: IgeGpuVertexBufferLayout = {
	arrayStride: 112,
	stepMode: "instance",
	attributes: ["a_instanceMatrix0", "a_instanceMatrix1", "a_instanceMatrix2", "a_instanceMatrix3", "a_instanceColor", "a_instanceEmissive", "a_instanceMaterial"]
		.map((name, i) => ({ shaderLocation: MESH_ATTRIBUTES[name], format: "float32x4" as const, offset: i * 16 }))
};

const FLOAT_FORMATS: IgeGpuVertexFormat[] = ["float32", "float32", "float32x2", "float32x3", "float32x4"];

/** GL's draw modes as the device's topologies (meshes are triangle lists). */
const TOPOLOGIES: Record<number, NonNullable<IgeGpuRenderPipelineDesc["primitive"]>["topology"]> = {
	0x0000: "point-list", 0x0001: "line-list", 0x0003: "line-strip", 0x0004: "triangle-list", 0x0005: "triangle-strip"
};

/** A mesh's vertex layout on the device (its interleaved attributes at MESH_ATTRIBUTES' locations), made once and kept on it. */
export function meshLayout (geometry: IgeWebGlGeometry): { layout: IgeGpuVertexBufferLayout; key: string } {
	if (geometry.gpuLayout) return geometry.gpuLayout;
	const attributes = geometry.attributes
		.filter((a) => MESH_ATTRIBUTES[a.name] !== undefined)
		.map((a) => ({ shaderLocation: MESH_ATTRIBUTES[a.name], format: FLOAT_FORMATS[a.size], offset: a.offset }));
	const layout: IgeGpuVertexBufferLayout = { arrayStride: geometry.attributes[0]?.stride ?? 0, attributes };
	geometry.gpuLayout = { layout, key: `${geometry.drawMode}:${layout.arrayStride}:${attributes.map((a) => `${a.shaderLocation}@${a.offset}`).join(",")}` };
	return geometry.gpuLayout;
}

/** A mesh's topology on the device. */
export function meshTopology (geometry: IgeWebGlGeometry): NonNullable<IgeGpuRenderPipelineDesc["primitive"]>["topology"] {
	return TOPOLOGIES[geometry.drawMode] ?? "triangle-list";
}

export class IgeGpuMeshPrograms {
	readonly device: IgeGpuDevice;
	protected _modules = new Map<string, IgeGpuShaderModule>();
	protected _pipelines = new Map<string, IgeGpuRenderPipeline>();

	constructor (device: IgeGpuDevice) {
		this.device = device;
	}

	/** The shader library's program `id` as a module (compiled as first asked for). */
	module (id: string): IgeGpuShaderModule {
		let m = this._modules.get(id);
		if (m) return m;
		const src = IgeShaderLibrary.get(id);
		if (!src) throw new Error(`IgeGpuMeshPrograms: no shader "${id}" in the library`);
		m = this.device.createShaderModule({ vertex: src.vertex, fragment: src.fragment, attributes: { ...MESH_ATTRIBUTES }, label: id });
		this._modules.set(id, m);
		return m;
	}

	/** The pipeline kept as `key`, made by `make` the first time. */
	pipeline (key: string, make: () => IgeGpuRenderPipelineDesc): IgeGpuRenderPipeline {
		let p = this._pipelines.get(key);
		if (!p) {
			p = this.device.createRenderPipeline(make());
			this._pipelines.set(key, p);
		}
		return p;
	}
}
