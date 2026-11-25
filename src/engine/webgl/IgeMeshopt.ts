import type { MeshoptDecoder } from "meshoptimizer/meshopt_decoder.module.js";

/**
 * Meshopt-compressed glTF (`EXT_meshopt_compression`, and `KHR_meshopt_compression` written with the same codecs):
 * what `gltfpack -c` and `-cc` write. A compressed buffer view's data sits in its extension, compressed; the view
 * itself points into a "fallback" buffer that holds nothing in the file (or, with `gltfpack -cf`, an uncompressed copy
 * for loaders that can't decode). Decoding fills the fallback buffers, after which the file reads like any other.
 *
 * The decoder is meshoptimizer's (WebAssembly, with SIMD where the browser has it), loaded on first use. Decoding
 * itself is synchronous and touches no DOM, so it runs in workers and Node too.
 */

export type IgeMeshoptDecoder = typeof MeshoptDecoder;

/** The extension's names: the vendor one gltfpack writes by default, and Khronos's. */
const EXTENSIONS = ["EXT_meshopt_compression", "KHR_meshopt_compression"] as const;

/** What meshoptimizer's decoder (0.18) reads. */
const MODES = new Set(["ATTRIBUTES", "TRIANGLES", "INDICES"]);
const FILTERS = new Set(["NONE", "OCTAHEDRAL", "QUATERNION", "EXPONENTIAL"]);

/* eslint-disable @typescript-eslint/no-explicit-any */

let loading: Promise<IgeMeshoptDecoder> | undefined;

/**
 * meshoptimizer's decoder, ready to use: loaded and compiled on the first call (tens of kilobytes, once), the same
 * one after that.
 */
export function igeMeshoptDecoder (): Promise<IgeMeshoptDecoder> {
	loading ??= import(/* webpackChunkName: "meshopt-decoder" */ "meshoptimizer/meshopt_decoder.module.js").then(async ({ MeshoptDecoder: decoder }) => {
		if (!decoder.supported) throw new Error("Meshopt-compressed models need WebAssembly, which this browser doesn't have");
		await decoder.ready;
		return decoder;
	}).catch((error) => {
		// (try again next time)
		loading = undefined;
		throw error;
	});
	return loading;
}

/** A buffer view's meshopt extension, if it's compressed. */
function meshoptOf (bufferView: any): any {
	for (const name of EXTENSIONS) {
		const ext = bufferView?.extensions?.[name];
		if (ext) return ext;
	}
	return undefined;
}

/** Whether any of a glTF's buffer views are meshopt-compressed. */
export function igeUsesMeshopt (gltf: any): boolean {
	return (gltf.bufferViews ?? []).some((v: any) => meshoptOf(v) !== undefined);
}

/**
 * Whether a buffer is a meshopt fallback buffer: one that only compressed views point into, so a loader that decodes
 * needn't fetch it (a GLB's has no data at all).
 */
export function igeIsMeshoptFallback (buffer: any): boolean {
	return EXTENSIONS.some((name) => buffer?.extensions?.[name]?.fallback === true);
}

/**
 * Decodes a glTF's meshopt-compressed buffer views into the buffers they point at, so the file then reads as an
 * uncompressed one. `buffers` are the file's buffers by index (a GLB's binary chunk is buffer 0); a fallback buffer
 * that's missing is made (zeroed, its declared length) and filled in place in `buffers`. `decoder` comes from
 * igeMeshoptDecoder() (or meshoptimizer's MeshoptDecoder once its `ready` has resolved).
 * @example #Decode a GLB by hand (in a worker, say)
 *     const decoder = await igeMeshoptDecoder();
 *     igeDecodeMeshopt(json, buffers, decoder);
 */
export function igeDecodeMeshopt (gltf: any, buffers: (ArrayBuffer | undefined)[], decoder: IgeMeshoptDecoder): void {
	const views: any[] = gltf.bufferViews ?? [];
	for (let i = 0; i < views.length; i++) {
		const view = views[i];
		const ext = meshoptOf(view);
		if (!ext) continue;
		const mode: string = ext.mode, filter: string = ext.filter ?? "NONE";
		if (!MODES.has(mode)) throw new Error(`Meshopt buffer view ${i}: unknown mode "${mode}"`);
		if (!FILTERS.has(filter)) throw new Error(`Meshopt buffer view ${i}: the "${filter}" filter isn't supported (meshoptimizer 0.18 decodes ${[...FILTERS].join(", ")})`);
		const source = buffers[ext.buffer];
		if (!source) throw new Error(`Meshopt buffer view ${i}: its compressed data's buffer ${ext.buffer} isn't loaded`);
		const index = view.buffer ?? 0;
		let target = buffers[index];
		if (!target) {
			const length = gltf.buffers?.[index]?.byteLength;
			if (!(length > 0)) throw new Error(`Meshopt buffer view ${i}: its buffer ${index} has no byteLength`);
			target = buffers[index] = new ArrayBuffer(length);
		}
		const size: number = ext.byteStride, count: number = ext.count;
		const bytes = new Uint8Array(source, ext.byteOffset ?? 0, ext.byteLength);
		try {
			decoder.decodeGltfBuffer(new Uint8Array(target, view.byteOffset ?? 0, count * size), count, size, bytes, mode, filter);
		} catch (error) {
			// gltfpack's KHR_meshopt_compression (-ce khr) writes vertex data in the codec's version 1, which 0.18 can't read
			const version = mode === "ATTRIBUTES" && bytes[0] > 0xa0 && bytes[0] <= 0xaf ? ` (vertex codec version ${bytes[0] - 0xa0}: meshoptimizer 0.18 reads version 0, what gltfpack writes for EXT_meshopt_compression)` : "";
			throw new Error(`Meshopt buffer view ${i} (${mode}, ${filter}) couldn't be decoded${version}: ${(error as Error).message}`);
		}
	}
}
