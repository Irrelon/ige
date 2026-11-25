/**
 * Builds the example's chunks off the main thread: merges each chunk's pieces into one mesh per material and packs
 * them (quantised, or as floats) in the layout the renderer uploads, then hands the buffers over (transferred, not
 * copied). Messages:
 *
 *     → { type: "init", library }            the pieces, once
 *     → { type: "build", cx, cz, format }
 *     ← { type: "built", chunk }             its buffers transferred
 */
import { geometryTransferables, IGE_QUANTISED_ENCODINGS } from "@/engine/webgl/IgeVertexPacking";
import { type BlockLibrary, buildChunk, type BuiltChunk, type ChunkFormat } from "./blocks";

export type ChunkWorkerRequest =
	| { type: "init"; library: BlockLibrary }
	| { type: "build"; cx: number; cz: number; format: ChunkFormat };

export type ChunkWorkerReply = { type: "built"; chunk: BuiltChunk } | { type: "error"; message: string };

let library: BlockLibrary | undefined;
// The worker's global (the project's types are the DOM's, not a worker's)
const scope = self as unknown as {
	onmessage: ((event: MessageEvent<ChunkWorkerRequest>) => void) | null;
	postMessage (message: ChunkWorkerReply, transfer?: Transferable[]): void;
};

scope.onmessage = (event: MessageEvent<ChunkWorkerRequest>) => {
	const msg = event.data;
	if (msg.type === "init") {
		library = msg.library;
		return;
	}
	try {
		const chunk = buildChunk(msg.cx, msg.cz, library!, msg.format, IGE_QUANTISED_ENCODINGS);
		scope.postMessage({ type: "built", chunk }, chunk.meshes.flatMap((m) => geometryTransferables(m.geometry)));
	} catch (error) {
		scope.postMessage({ type: "error", message: String(error) });
	}
};
