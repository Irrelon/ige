import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/*
 * Breakable props for tests, built from boxes and blocks (no art): one
 * IGE unit is a centimetre. The breakables example builds the same kinds
 * of thing with more detail.
 */

const WOOD = { r: 0.62, g: 0.45, b: 0.27, a: 1 };

/** A 60 cm crate: three planks on each of its six sides, hollow inside. */
export function crateMesh (id = "testCrate"): IgeGeometryData3d {
	const boxes: Parameters<typeof IgePrimitiveGeometry.createBoxes>[0] = [];
	const h = 30, t = 2, gap = 1, plank = (56 - gap * 2) / 3;
	for (let i = 0; i < 3; i++) {
		const along = -28 + plank / 2 + i * (plank + gap);
		for (const s of [-1, 1]) {
			boxes.push({ x: s * (h - t / 2), y: along, z: 0, w: t, h: plank, d: 60, color: WOOD }); // sides: planks along z
			boxes.push({ x: 0, y: along, z: s * (h - t / 2), w: 56, h: plank, d: t, color: WOOD }); // front and back: along x
			boxes.push({ x: 0, y: s * (h - t / 2), z: along * (60 / 56), w: 60, h: t, d: (plank * 60) / 56, color: WOOD }); // top and bottom
		}
	}
	return IgePrimitiveGeometry.createBoxes(boxes, id);
}

/** A 2 m fence panel: two rails and nine pales, the pales' bottoms at y = 0. */
export function fenceMesh (id = "testFence"): IgeGeometryData3d {
	const boxes: Parameters<typeof IgePrimitiveGeometry.createBoxes>[0] = [];
	for (const y of [25, 95]) boxes.push({ x: 0, y, z: 0, w: 200, h: 8, d: 3, color: WOOD });
	for (let i = 0; i < 9; i++) boxes.push({ x: -88 + i * 22, y: 60, z: 2.5, w: 16, h: 120, d: 2, color: WOOD });
	return IgePrimitiveGeometry.createBoxes(boxes, id);
}

/** A pane of glass 150 x 120 cm, 8 mm thick, standing in the x-y plane. */
export function paneMesh (id = "testPane"): IgeGeometryData3d {
	return IgePrimitiveGeometry.createBoxes([{ x: 0, y: 60, z: 0, w: 150, h: 120, d: 0.8, color: { r: 0.7, g: 0.85, b: 0.9, a: 1 } }], id);
}

/** A concrete road barrier 2 m long: a tapered block, 60 cm wide at the bottom, 20 cm at the top, 80 cm tall. */
export function barrierMesh (id = "testBarrier"): IgeGeometryData3d {
	const corners: number[] = [];
	for (let i = 0; i < 8; i++) {
		const top = (i & 2) !== 0;
		const half = top ? 10 : 30;
		corners.push((i & 1 ? 1 : -1) * 100, top ? 80 : 0, (i & 4 ? 1 : -1) * half);
	}
	return IgePrimitiveGeometry.createBlocks([{ corners, color: { r: 0.75, g: 0.74, b: 0.7, a: 1 } }], id);
}

/** A traffic cone 70 cm tall: a square base and a hollow wall of 10 tapered segments. */
export function coneMesh (id = "testCone"): IgeGeometryData3d {
	const blocks: Parameters<typeof IgePrimitiveGeometry.createBlocks>[0] = [];
	const orange = { r: 0.95, g: 0.42, b: 0.08, a: 1 };
	const base = IgePrimitiveGeometry.createBoxes([{ x: 0, y: 2, z: 0, w: 40, h: 4, d: 40, color: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }]);
	const segments = 10, thick = 1.2, bottom = 15, top = 3, height = 66;
	// Corners round the circle from a fixed table, so the mesh is the same on every machine
	const ring: [number, number][] = [];
	for (let s = 0; s <= segments; s++) {
		const a = (s / segments) * Math.PI * 2;
		ring.push([Math.round(Math.cos(a) * 1e6) / 1e6, Math.round(Math.sin(a) * 1e6) / 1e6]);
	}
	for (let s = 0; s < segments; s++) {
		const corners: number[] = [];
		for (let i = 0; i < 8; i++) {
			const [cx, cz] = ring[s + 1 - (i & 1)]; // +x of the block runs clockwise, so its faces wind outward
			const up = (i & 2) !== 0;
			const outer = (i & 4) !== 0;
			const r = (up ? top : bottom) + (outer ? thick : 0);
			corners.push(cx * r, 4 + (up ? height : 0), cz * r);
		}
		blocks.push({ corners, color: orange });
	}
	const wall = IgePrimitiveGeometry.createBlocks(blocks);
	return mergeMeshes([base, wall], id);
}

/** Meshes joined into one (positions, normals, uvs, colours and indices). */
export function mergeMeshes (meshes: IgeGeometryData3d[], id: string): IgeGeometryData3d {
	const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
	for (const mesh of meshes) {
		const base = vertices.length / 3;
		const count = mesh.vertices!.length / 3;
		vertices.push(...mesh.vertices!);
		normals.push(...(mesh.normals || new Float32Array(count * 3)));
		uvs.push(...(mesh.uvs || new Float32Array(count * 2)));
		for (let i = 0; i < count; i++) {
			if (mesh.colors) colors.push(mesh.colors[i * 4], mesh.colors[i * 4 + 1], mesh.colors[i * 4 + 2], mesh.colors[i * 4 + 3]);
			else colors.push(1, 1, 1, 1);
		}
		for (const index of mesh.indices!) indices.push(base + index);
	}
	return {
		id,
		type: "primitive",
		vertices: new Float32Array(vertices),
		normals: new Float32Array(normals),
		uvs: new Float32Array(uvs),
		colors: new Float32Array(colors),
		indices: new Uint32Array(indices)
	};
}
