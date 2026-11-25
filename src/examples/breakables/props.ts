import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/*
 * Street props made from boxes and blocks (no art), one IGE unit to the
 * centimetre, each standing on y = 0. Props that break are built from
 * separate convex parts (planks, panes, wall segments), which is what the
 * fracturer cuts best: wood snaps plank by plank, glass and plastic crack
 * into shards, concrete into chunks.
 */

type Color = { r: number; g: number; b: number; a?: number };
type Box = Parameters<typeof IgePrimitiveGeometry.createBoxes>[0][number];

export const COLORS = {
	wood: { r: 0.66, g: 0.48, b: 0.3 },
	darkWood: { r: 0.5, g: 0.35, b: 0.22 },
	paleWood: { r: 0.8, g: 0.68, b: 0.5 },
	steel: { r: 0.35, g: 0.36, b: 0.38 },
	concrete: { r: 0.74, g: 0.73, b: 0.69 },
	orange: { r: 0.96, g: 0.42, b: 0.08 },
	white: { r: 0.95, g: 0.95, b: 0.93 },
	red: { r: 0.78, g: 0.1, b: 0.1 },
	green: { r: 0.15, g: 0.35, b: 0.2 },
	black: { r: 0.08, g: 0.08, b: 0.09 },
	glass: { r: 0.85, g: 0.95, b: 1 }
};

/** A quaternion turning round the y axis. */
export function yaw (radians: number) {
	return { x: 0, y: Math.sin(radians / 2), z: 0, w: Math.cos(radians / 2) };
}

/** A quaternion turning round the x axis. */
export function pitch (radians: number) {
	return { x: Math.sin(radians / 2), y: 0, z: 0, w: Math.cos(radians / 2) };
}

/** A 60 cm crate: three planks on each side, a little uneven in colour, hollow inside. */
export function crateMesh (): IgeGeometryData3d {
	const boxes: Box[] = [];
	const h = 30, t = 2, gap = 1, plank = (56 - gap * 2) / 3;
	const shade = [COLORS.wood, COLORS.darkWood, COLORS.paleWood];
	for (let i = 0; i < 3; i++) {
		const along = -28 + plank / 2 + i * (plank + gap);
		for (const s of [-1, 1]) {
			const color = shade[(i + (s > 0 ? 1 : 0)) % 3];
			boxes.push({ x: s * (h - t / 2), y: 30 + along, z: 0, w: t, h: plank, d: 60, color });
			boxes.push({ x: 0, y: 30 + along, z: s * (h - t / 2), w: 56, h: plank, d: t, color: shade[(i + 2) % 3] });
			boxes.push({ x: 0, y: 30 + s * (h - t / 2), z: along * (60 / 56), w: 60, h: t, d: (plank * 60) / 56, color });
		}
	}
	return IgePrimitiveGeometry.createBoxes(boxes, "propCrate");
}

/** A pallet 120 x 100 cm, 14 cm tall: five deck boards, three bearers on nine blocks, three bottom boards. */
export function palletMesh (): IgeGeometryData3d {
	const boxes: Box[] = [];
	for (let i = 0; i < 3; i++) boxes.push({ x: 0, y: 1, z: -42 + i * 42, w: 120, h: 2, d: 14, color: COLORS.darkWood });
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) boxes.push({ x: -52 + j * 52, y: 6, z: -42 + i * 42, w: 12, h: 8, d: 12, color: COLORS.wood });
	}
	for (let j = 0; j < 3; j++) boxes.push({ x: -52 + j * 52, y: 11, z: 0, w: 12, h: 2, d: 100, color: COLORS.darkWood });
	for (let i = 0; i < 5; i++) boxes.push({ x: 0, y: 13, z: -42 + i * 21, w: 120, h: 2, d: 14, color: COLORS.paleWood });
	return IgePrimitiveGeometry.createBoxes(boxes, "propPallet");
}

/** A 2 m wooden fence panel: two rails and nine pales, along x. */
export function fenceMesh (): IgeGeometryData3d {
	const boxes: Box[] = [];
	for (const y of [25, 95]) boxes.push({ x: 0, y, z: 0, w: 200, h: 8, d: 3, color: COLORS.darkWood });
	for (let i = 0; i < 9; i++) boxes.push({ x: -88 + i * 22, y: 61, z: 2.5, w: 16, h: 118, d: 2, color: i % 2 ? COLORS.wood : COLORS.paleWood });
	return IgePrimitiveGeometry.createBoxes(boxes, "propFence");
}

/** A pane of glass, w wide and h tall, 1 cm thick, its bottom edge at y = 0. */
export function paneMesh (w: number, h: number, id: string): IgeGeometryData3d {
	return IgePrimitiveGeometry.createBoxes([{ x: 0, y: h / 2, z: 0, w, h, d: 1, color: COLORS.glass }], id);
}

/** A concrete road barrier 2 m long: a tapered block, 60 cm wide at its foot, 20 at its top, 80 tall. */
export function barrierMesh (): IgeGeometryData3d {
	const corners: number[] = [];
	for (let i = 0; i < 8; i++) {
		const top = (i & 2) !== 0;
		corners.push((i & 1 ? 1 : -1) * 100, top ? 80 : 0, (i & 4 ? 1 : -1) * (top ? 10 : 30));
	}
	return IgePrimitiveGeometry.createBlocks([{ corners, color: COLORS.concrete }], "propBarrier");
}

/** A red and white plastic roadworks barrier: a hollow board on two feet. */
export function plasticBarrierMesh (): IgeGeometryData3d {
	const boxes: Box[] = [];
	for (let i = 0; i < 6; i++) boxes.push({ x: -125 + i * 50, y: 60, z: 0, w: 50, h: 40, d: 2, color: i % 2 ? COLORS.white : COLORS.red });
	for (const x of [-110, 110]) {
		boxes.push({ x, y: 22, z: 0, w: 6, h: 36, d: 4, color: COLORS.red });
		boxes.push({ x, y: 2, z: 0, w: 14, h: 4, d: 50, color: COLORS.black });
	}
	return IgePrimitiveGeometry.createBoxes(boxes, "propPlasticBarrier");
}

/** A traffic cone 70 cm tall: a square base and a hollow wall of ten tapered segments, with a white band. */
export function coneMesh (): IgeGeometryData3d {
	const blocks: { corners: number[]; color?: Color }[] = [];
	const segments = 10, thick = 1.2, height = 66;
	// Two rings of segments: orange below, a white band above (as separate parts, so they break apart)
	const bands: [number, number, number, number, Color][] = [[4, 40, 15, 7.8, COLORS.orange], [40, 54, 7.8, 5.4, COLORS.white], [54, 4 + height, 5.4, 3, COLORS.orange]];
	const ring: [number, number][] = [];
	for (let s = 0; s <= segments; s++) {
		const a = (s / segments) * Math.PI * 2;
		ring.push([Math.round(Math.cos(a) * 1e6) / 1e6, Math.round(Math.sin(a) * 1e6) / 1e6]);
	}
	for (const [y0, y1, r0, r1, color] of bands) {
		for (let s = 0; s < segments; s++) {
			const corners: number[] = [];
			for (let i = 0; i < 8; i++) {
				// +x of each block runs clockwise round the cone, so its faces wind outward
				const [cx, cz] = ring[s + 1 - (i & 1)];
				const up = (i & 2) !== 0;
				const r = (up ? r1 : r0) + ((i & 4) !== 0 ? thick : 0);
				corners.push(cx * r, up ? y1 : y0, cz * r);
			}
			blocks.push({ corners, color });
		}
	}
	const base: number[] = [];
	for (let i = 0; i < 8; i++) base.push((i & 1 ? 1 : -1) * 20, i & 2 ? 4 : 0, (i & 4 ? 1 : -1) * 20);
	blocks.push({ corners: base, color: COLORS.black });
	return IgePrimitiveGeometry.createBlocks(blocks, "propCone");
}

/** A wheelie bin 60 x 100 x 70 cm: a base, four thin walls and a lid, hollow inside. */
export function binMesh (): IgeGeometryData3d {
	const c = COLORS.green, t = 1.5;
	const boxes: Box[] = [
		{ x: 0, y: 6, z: 0, w: 56, h: 3, d: 66, color: c },
		{ x: -28 + t / 2, y: 52, z: 0, w: t, h: 89, d: 66, color: c },
		{ x: 28 - t / 2, y: 52, z: 0, w: t, h: 89, d: 66, color: c },
		{ x: 0, y: 52, z: -33 + t / 2, w: 56 - t * 2, h: 89, d: t, color: c },
		{ x: 0, y: 52, z: 33 - t / 2, w: 56 - t * 2, h: 89, d: t, color: c },
		{ x: 0, y: 98, z: 0, w: 60, h: 3, d: 72, color: { r: 0.12, g: 0.28, b: 0.16 } }
	];
	for (const x of [-22, 22]) boxes.push({ x, y: 2.25, z: -28, w: 6, h: 4.5, d: 10, color: COLORS.black });
	return IgePrimitiveGeometry.createBoxes(boxes, "propBin");
}

/** A park bench 180 cm long: three seat slats and two back slats on two steel frames. */
export function benchMesh (): IgeGeometryData3d {
	const boxes: Box[] = [];
	// Parts touch but never overlap, so the pieces don't spring apart when it breaks
	for (let i = 0; i < 3; i++) boxes.push({ x: 0, y: 45.5, z: -11 + i * 11, w: 180, h: 3, d: 9, color: i === 1 ? COLORS.paleWood : COLORS.wood });
	for (let i = 0; i < 2; i++) boxes.push({ x: 0, y: 60 + i * 14, z: -20 - i * 2.5, w: 180, h: 10, d: 3, rotation: pitch(-0.18), color: COLORS.wood });
	for (const x of [-75, 75]) {
		boxes.push({ x, y: 21, z: -11, w: 5, h: 42, d: 5, color: COLORS.steel });
		boxes.push({ x, y: 21, z: 11, w: 5, h: 42, d: 5, color: COLORS.steel });
		boxes.push({ x, y: 43, z: 0, w: 5, h: 2, d: 30, color: COLORS.steel });
		boxes.push({ x: x * 0.9, y: 66, z: -28, w: 5, h: 40, d: 4, rotation: pitch(-0.18), color: COLORS.steel });
	}
	return IgePrimitiveGeometry.createBoxes(boxes, "propBench");
}

/** A steel bollard: a post 18 cm square and a metre tall. */
export function bollardMesh (): IgeGeometryData3d {
	return IgePrimitiveGeometry.createBoxes([
		{ x: 0, y: 50, z: 0, w: 18, h: 100, d: 18, color: COLORS.steel }
	], "propBollard");
}

/** Boxes for the parts of a frame that don't break (posts, a roof), as one mesh. */
export function frameMesh (boxes: Box[], id: string): IgeGeometryData3d {
	return IgePrimitiveGeometry.createBoxes(boxes, id);
}

/** A wheel: a cylinder of a radius and width with its axle along X (as in the vehicles example). */
export function wheelMesh (radius: number, width: number, segments: number, id: string): IgeGeometryData3d {
	const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
	const hw = width / 2;
	for (let i = 0; i <= segments; i++) {
		const a = (i / segments) * Math.PI * 2;
		const cy = Math.cos(a), cz = Math.sin(a);
		vertices.push(-hw, cy * radius, cz * radius, hw, cy * radius, cz * radius);
		normals.push(0, cy, cz, 0, cy, cz);
		uvs.push(i / segments, 0, i / segments, 1);
	}
	for (let i = 0; i < segments; i++) {
		const b = i * 2;
		indices.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
	}
	for (const side of [-1, 1]) {
		const centre = vertices.length / 3;
		vertices.push(side * hw, 0, 0);
		normals.push(side, 0, 0);
		uvs.push(0.5, 0.5);
		for (let i = 0; i <= segments; i++) {
			const a = (i / segments) * Math.PI * 2;
			vertices.push(side * hw, Math.cos(a) * radius, Math.sin(a) * radius);
			normals.push(side, 0, 0);
			uvs.push(0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2);
		}
		for (let i = 0; i < segments; i++) {
			if (side > 0) indices.push(centre, centre + 1 + i, centre + 2 + i);
			else indices.push(centre, centre + 2 + i, centre + 1 + i);
		}
	}
	return { id, type: "primitive", vertices: new Float32Array(vertices), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}
