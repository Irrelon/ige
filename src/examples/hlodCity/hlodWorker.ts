/**
 * Builds the example city's HLOD nodes off the main thread: a chunk (level 0) as its pieces merged into one mesh,
 * and a group (level 1 up: 2 x 2, 4 x 4... chunks) as a proxy, igeBuildHlodProxy() to its level's error. Both are
 * packed (quantised) in the layout the renderer uploads and handed over (transferred, not copied).
 *
 *     → { id, level, x, z, tint }
 *     ← { id, meshes, triangles, sourceTriangles, ms }
 */
import { type IgeMergePiece, mergeGeometry } from "@/engine/webgl/IgeGeometryMerge";
import { igeBuildHlodProxy } from "@/engine/webgl/IgeHlodBuilder";
import { geometryTransferables, IGE_QUANTISED_ENCODINGS } from "@/engine/webgl/IgeVertexPacking";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { CELLS, cellPieces } from "./city";

export interface HlodBuildRequest { id: number; level: number; x: number; z: number; tint: boolean }
export interface HlodBuildReply { id: number; meshes: IgeGeometryData3d[]; triangles: number; sourceTriangles: number; ms: number; error?: string }

/** A level's error (metres): 1 m for 2 x 2 groups, doubling each level up (a quarter of it up and down). */
export const levelError = (level: number) => 0.5 * Math.pow(2, level);

/** Levels told apart when tinting: chunks as they are, then warmer to cooler. */
const TINTS: [number, number, number][] = [[1, 1, 1], [1, 0.75, 0.75], [0.75, 1, 0.75], [0.75, 0.8, 1], [1, 1, 0.6], [1, 0.7, 1]];

const scope = self as unknown as {
	onmessage: ((event: MessageEvent<HlodBuildRequest>) => void) | null;
	postMessage (message: HlodBuildReply, transfer?: Transferable[]): void;
};

scope.onmessage = (event: MessageEvent<HlodBuildRequest>) => {
	const { id, level, x, z, tint } = event.data;
	const t0 = performance.now();
	try {
		const span = 1 << level;
		const color = tint ? TINTS[Math.min(level, TINTS.length - 1)] : undefined;
		let meshes: IgeGeometryData3d[], triangles: number, sourceTriangles: number;
		if (level === 0) {
			const merged = mergeGeometry(cellPieces(x, z, 0, color), { id: `chunk_${x}_${z}`, pack: IGE_QUANTISED_ENCODINGS });
			meshes = merged.map((m) => m.geometry);
			triangles = sourceTriangles = merged.reduce((n, m) => n + m.triangles, 0);
		} else {
			// The group's chunks without the parts its proxy would drop anyway (smaller than its error), and without
			// windows and ledges at any level (detail for the chunks alone)
			const error = levelError(level), pieces: IgeMergePiece[] = [];
			for (let cz = z * span; cz < Math.min(CELLS, (z + 1) * span); cz++) {
				for (let cx = x * span; cx < Math.min(CELLS, (x + 1) * span); cx++) pieces.push(...cellPieces(cx, cz, Math.max(error, 1.5), color));
			}
			const proxies = igeBuildHlodProxy(pieces, { id: `hlod_${level}_${x}_${z}`, error, heightError: error / 4, pack: IGE_QUANTISED_ENCODINGS });
			meshes = proxies.map((p) => p.geometry);
			triangles = proxies.reduce((n, p) => n + p.triangles, 0);
			sourceTriangles = proxies.reduce((n, p) => n + p.sourceTriangles, 0);
		}
		scope.postMessage({ id, meshes, triangles, sourceTriangles, ms: performance.now() - t0 }, meshes.flatMap((m) => geometryTransferables(m)));
	} catch (error) {
		scope.postMessage({ id, meshes: [], triangles: 0, sourceTriangles: 0, ms: 0, error: String(error) });
	}
};
