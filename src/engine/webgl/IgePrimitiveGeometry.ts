import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** Counts default ids so two shapes made in the same millisecond don't share a cached GPU mesh. */
let _primitiveIdCounter = 0;
const primitiveId = (prefix: string) => `${prefix}_${++_primitiveIdCounter}_${Date.now().toString(36)}`;

/**
 * Utility class for generating primitive 3D geometries.
 */
export class IgePrimitiveGeometry {
	/**
	 * Create a cube geometry with proper normals for lighting.
	 * @param size The size of the cube (default 1)
	 * @param id Optional ID for the geometry
	 */
	static createCube(size: number = 1, id?: string): IgeGeometryData3d {
		const s = size / 2;

		// Each face has 4 vertices with proper normals (6 faces * 4 vertices = 24 vertices)
		// prettier-ignore
		const vertices = new Float32Array([
			// Front face (z = +s, normal = 0, 0, 1)
			-s, -s,  s,
			 s, -s,  s,
			 s,  s,  s,
			-s,  s,  s,

			// Back face (z = -s, normal = 0, 0, -1)
			 s, -s, -s,
			-s, -s, -s,
			-s,  s, -s,
			 s,  s, -s,

			// Top face (y = +s, normal = 0, 1, 0)
			-s,  s,  s,
			 s,  s,  s,
			 s,  s, -s,
			-s,  s, -s,

			// Bottom face (y = -s, normal = 0, -1, 0)
			-s, -s, -s,
			 s, -s, -s,
			 s, -s,  s,
			-s, -s,  s,

			// Right face (x = +s, normal = 1, 0, 0)
			 s, -s,  s,
			 s, -s, -s,
			 s,  s, -s,
			 s,  s,  s,

			// Left face (x = -s, normal = -1, 0, 0)
			-s, -s, -s,
			-s, -s,  s,
			-s,  s,  s,
			-s,  s, -s,
		]);

		// prettier-ignore
		const normals = new Float32Array([
			// Front face
			0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
			// Back face
			0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
			// Top face
			0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
			// Bottom face
			0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
			// Right face
			1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
			// Left face
			-1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
		]);

		// prettier-ignore
		const uvs = new Float32Array([
			// Front face
			0, 0,  1, 0,  1, 1,  0, 1,
			// Back face
			0, 0,  1, 0,  1, 1,  0, 1,
			// Top face
			0, 0,  1, 0,  1, 1,  0, 1,
			// Bottom face
			0, 0,  1, 0,  1, 1,  0, 1,
			// Right face
			0, 0,  1, 0,  1, 1,  0, 1,
			// Left face
			0, 0,  1, 0,  1, 1,  0, 1,
		]);

		// Each face has 2 triangles (6 faces * 6 indices = 36 indices)
		// prettier-ignore
		const indices = new Uint16Array([
			// Front
			0, 1, 2,  0, 2, 3,
			// Back
			4, 5, 6,  4, 6, 7,
			// Top
			8, 9, 10,  8, 10, 11,
			// Bottom
			12, 13, 14,  12, 14, 15,
			// Right
			16, 17, 18,  16, 18, 19,
			// Left
			20, 21, 22,  20, 22, 23,
		]);

		return {
			id: id || primitiveId("cube"),
			type: "primitive",
			vertices,
			normals,
			uvs,
			indices,
			boundingBox: {
				min: [-s, -s, -s],
				max: [s, s, s]
			},
			boundingSphere: {
				center: [0, 0, 0],
				radius: Math.sqrt(3) * s
			}
		};
	}

	/**
	 * Create a sphere geometry with proper normals for lighting.
	 * @param radius The radius of the sphere (default 1)
	 * @param segments Number of horizontal segments (default 16)
	 * @param rings Number of vertical rings (default 16)
	 * @param id Optional ID for the geometry
	 */
	static createSphere(
		radius: number = 1,
		segments: number = 16,
		rings: number = 16,
		id?: string
	): IgeGeometryData3d {
		const vertices: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];

		// Generate vertices
		for (let ring = 0; ring <= rings; ring++) {
			const phi = (ring / rings) * Math.PI; // 0 to PI
			const sinPhi = Math.sin(phi);
			const cosPhi = Math.cos(phi);

			for (let seg = 0; seg <= segments; seg++) {
				const theta = (seg / segments) * Math.PI * 2; // 0 to 2PI
				const sinTheta = Math.sin(theta);
				const cosTheta = Math.cos(theta);

				// Normal (pointing outward from center)
				const nx = sinPhi * cosTheta;
				const ny = cosPhi;
				const nz = sinPhi * sinTheta;

				// Position
				const x = radius * nx;
				const y = radius * ny;
				const z = radius * nz;

				// UV
				const u = seg / segments;
				const v = ring / rings;

				vertices.push(x, y, z);
				normals.push(nx, ny, nz);
				uvs.push(u, v);
			}
		}

		// Generate indices
		for (let ring = 0; ring < rings; ring++) {
			for (let seg = 0; seg < segments; seg++) {
				const curr = ring * (segments + 1) + seg;
				const next = curr + segments + 1;

				// Two triangles per quad
				indices.push(curr, next, curr + 1);
				indices.push(curr + 1, next, next + 1);
			}
		}

		return {
			id: id || primitiveId("sphere"),
			type: "primitive",
			vertices: new Float32Array(vertices),
			normals: new Float32Array(normals),
			uvs: new Float32Array(uvs),
			indices: new Uint16Array(indices),
			boundingBox: {
				min: [-radius, -radius, -radius],
				max: [radius, radius, radius]
			},
			boundingSphere: {
				center: [0, 0, 0],
				radius
			}
		};
	}

	/**
	 * Create a plane geometry (quad) with proper normals.
	 * @param width Width of the plane (default 1)
	 * @param height Height of the plane (default 1)
	 * @param id Optional ID for the geometry
	 */
	static createPlane(width: number = 1, height: number = 1, id?: string): IgeGeometryData3d {
		const hw = width / 2;
		const hh = height / 2;

		// prettier-ignore
		const vertices = new Float32Array([
			-hw, -hh, 0,
			 hw, -hh, 0,
			 hw,  hh, 0,
			-hw,  hh, 0,
		]);

		// prettier-ignore
		const normals = new Float32Array([
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
		]);

		// prettier-ignore
		const uvs = new Float32Array([
			0, 0,
			1, 0,
			1, 1,
			0, 1,
		]);

		// prettier-ignore
		const indices = new Uint16Array([
			0, 1, 2,
			0, 2, 3,
		]);

		return {
			id: id || primitiveId("plane"),
			type: "primitive",
			vertices,
			normals,
			uvs,
			indices,
			boundingBox: {
				min: [-hw, -hh, 0],
				max: [hw, hh, 0]
			},
			boundingSphere: {
				center: [0, 0, 0],
				radius: Math.sqrt(hw * hw + hh * hh)
			}
		};
	}

	/**
	 * One mesh from many boxes, each with its own size, centre, rotation and
	 * vertex colour: props built from planks and posts (a crate, a pallet, a
	 * fence panel, a bench). Each box stays a separate closed part, which is
	 * what igeFracture() cuts best.
	 * @param boxes Centre (x, y, z), size (w, h, d), an optional rotation (a unit quaternion) and colour.
	 * @example #A fence panel: two rails and eight pales
	 *     const boxes = [{ x: 0, y: 30, z: 0, w: 200, h: 8, d: 3 }, { x: 0, y: 90, z: 0, w: 200, h: 8, d: 3 }];
	 *     for (let i = 0; i < 8; i++) boxes.push({ x: -88 + i * 25, y: 60, z: 3, w: 18, h: 120, d: 2 });
	 *     const fence = IgePrimitiveGeometry.createBoxes(boxes, "fencePanel");
	 */
	static createBoxes(
		boxes: { x: number; y: number; z: number; w: number; h: number; d: number; rotation?: { x: number; y: number; z: number; w: number }; color?: { r: number; g: number; b: number; a?: number } }[],
		id?: string
	): IgeGeometryData3d {
		return IgePrimitiveGeometry.createBlocks(boxes.map((box) => {
			const corners: number[] = [];
			const q = box.rotation;
			for (let i = 0; i < 8; i++) {
				let x = (i & 1 ? 0.5 : -0.5) * box.w, y = (i & 2 ? 0.5 : -0.5) * box.h, z = (i & 4 ? 0.5 : -0.5) * box.d;
				if (q) {
					// v' = v + w t + q x t, t = 2 (q x v)
					const tx = 2 * (q.y * z - q.z * y), ty = 2 * (q.z * x - q.x * z), tz = 2 * (q.x * y - q.y * x);
					const rx = x + q.w * tx + (q.y * tz - q.z * ty), ry = y + q.w * ty + (q.z * tx - q.x * tz), rz = z + q.w * tz + (q.x * ty - q.y * tx);
					x = rx; y = ry; z = rz;
				}
				corners.push(box.x + x, box.y + y, box.z + z);
			}
			return { corners, color: box.color };
		}), id);
	}

	/**
	 * One mesh from many six-sided blocks given by their eight corners: boxes
	 * pulled out of square (wedges, tapered posts, the segments of a cone's
	 * wall, a concrete barrier's profile). Corner i is at the (i & 1 ? +x :
	 * -x, i & 2 ? +y : -y, i & 4 ? +z : -z) end of the block, as for a box,
	 * so each face's four corners must lie in a plane.
	 * @param blocks 24 numbers each (x, y, z of the eight corners) and an optional vertex colour.
	 */
	static createBlocks(blocks: { corners: ArrayLike<number>; color?: { r: number; g: number; b: number; a?: number } }[], id?: string): IgeGeometryData3d {
		// Each face's corners, anticlockwise seen from outside
		const faces = [[4, 5, 7, 6], [1, 0, 2, 3], [6, 7, 3, 2], [0, 1, 5, 4], [5, 1, 3, 7], [0, 4, 6, 2]];
		const vertices: number[] = [], normals: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
		const withColor = blocks.some((block) => block.color);
		const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
		for (const block of blocks) {
			const c = block.corners;
			for (const face of faces) {
				const base = vertices.length / 3;
				const [a, b, cc, d] = face.map((i) => [c[i * 3], c[i * 3 + 1], c[i * 3 + 2]]);
				// The normal from the diagonals (works for any planar quad)
				const e1 = [cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]], e2 = [d[0] - b[0], d[1] - b[1], d[2] - b[2]];
				let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
				const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
				nx /= len; ny /= len; nz /= len;
				for (const p of [a, b, cc, d]) {
					vertices.push(p[0], p[1], p[2]);
					normals.push(nx, ny, nz);
					for (let k = 0; k < 3; k++) {
						if (p[k] < min[k]) min[k] = p[k];
						if (p[k] > max[k]) max[k] = p[k];
					}
					if (withColor) {
						const color = block.color || { r: 1, g: 1, b: 1, a: 1 };
						colors.push(color.r, color.g, color.b, color.a ?? 1);
					}
				}
				uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
				indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
			}
		}
		const centre = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
		return {
			id: id || primitiveId("blocks"),
			type: "primitive",
			vertices: new Float32Array(vertices),
			normals: new Float32Array(normals),
			uvs: new Float32Array(uvs),
			...(withColor ? { colors: new Float32Array(colors) } : {}),
			indices: vertices.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
			boundingBox: { min: min as [number, number, number], max: max as [number, number, number] },
			boundingSphere: {
				center: centre as [number, number, number],
				radius: Math.sqrt((max[0] - centre[0]) ** 2 + (max[1] - centre[1]) ** 2 + (max[2] - centre[2]) ** 2)
			}
		};
	}
}
