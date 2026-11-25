import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** A box w x h x d centred on the origin. */
export function createBox (w: number, h: number, d: number, id: string): IgeGeometryData3d {
	const x = w / 2, y = h / 2, z = d / 2;
	// Each face: four corners (counter-clockwise seen from outside) and its normal
	const faces: [number[], number[]][] = [
		[[-x, -y, z, x, -y, z, x, y, z, -x, y, z], [0, 0, 1]],
		[[x, -y, -z, -x, -y, -z, -x, y, -z, x, y, -z], [0, 0, -1]],
		[[-x, y, z, x, y, z, x, y, -z, -x, y, -z], [0, 1, 0]],
		[[-x, -y, -z, x, -y, -z, x, -y, z, -x, -y, z], [0, -1, 0]],
		[[x, -y, z, x, -y, -z, x, y, -z, x, y, z], [1, 0, 0]],
		[[-x, -y, -z, -x, -y, z, -x, y, z, -x, y, -z], [-1, 0, 0]]
	];
	const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
	faces.forEach(([corners, normal], face) => {
		vertices.push(...corners);
		for (let i = 0; i < 4; i++) normals.push(...normal);
		uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
		const b = face * 4;
		indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
	});
	return {
		id,
		type: "primitive",
		vertices: new Float32Array(vertices),
		normals: new Float32Array(normals),
		uvs: new Float32Array(uvs),
		indices: new Uint16Array(indices)
	};
}

/** A wheel: a cylinder of a radius and width with its axle along X, centred on the origin. */
export function createWheel (radius: number, width: number, segments: number, id: string): IgeGeometryData3d {
	const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
	const hw = width / 2;
	// Tread
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
	// Side walls
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
	return {
		id,
		type: "primitive",
		vertices: new Float32Array(vertices),
		normals: new Float32Array(normals),
		uvs: new Float32Array(uvs),
		indices: new Uint16Array(indices)
	};
}

/** Flat rectangles on the ground (x, z centres and sizes) as one mesh: road markings, a grid. */
export function createFlatRects (rects: { x: number; z: number; w: number; d: number }[], y: number, id: string): IgeGeometryData3d {
	const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
	rects.forEach((r, i) => {
		const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, z0 = r.z - r.d / 2, z1 = r.z + r.d / 2;
		vertices.push(x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0);
		normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
		uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
		const b = i * 4;
		indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
	});
	return {
		id,
		type: "primitive",
		vertices: new Float32Array(vertices),
		normals: new Float32Array(normals),
		uvs: new Float32Array(uvs),
		indices: vertices.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)
	};
}
