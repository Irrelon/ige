import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/**
 * Accumulates an indexed triangle mesh (position, normal, uv) in growable
 * typed arrays. One builder is reused for every chunk; toGeometry() copies
 * the result out so the builder can be reset.
 */
export class MeshBuilder {
	positions = new Float32Array(3 * 8192);
	normals = new Float32Array(3 * 8192);
	uvs = new Float32Array(2 * 8192);
	indices = new Uint32Array(3 * 8192);
	vertexCount = 0;
	indexCount = 0;

	protected _minX = Infinity;
	protected _minY = Infinity;
	protected _minZ = Infinity;
	protected _maxX = -Infinity;
	protected _maxY = -Infinity;
	protected _maxZ = -Infinity;

	reset (): void {
		this.vertexCount = 0;
		this.indexCount = 0;
		this._minX = this._minY = this._minZ = Infinity;
		this._maxX = this._maxY = this._maxZ = -Infinity;
	}

	vertex (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number): number {
		const n = this.vertexCount;
		if (n * 3 + 3 > this.positions.length) this._growVertices();

		const p = n * 3;
		this.positions[p] = x;
		this.positions[p + 1] = y;
		this.positions[p + 2] = z;
		this.normals[p] = nx;
		this.normals[p + 1] = ny;
		this.normals[p + 2] = nz;
		this.uvs[n * 2] = u;
		this.uvs[n * 2 + 1] = v;

		if (x < this._minX) this._minX = x;
		if (y < this._minY) this._minY = y;
		if (z < this._minZ) this._minZ = z;
		if (x > this._maxX) this._maxX = x;
		if (y > this._maxY) this._maxY = y;
		if (z > this._maxZ) this._maxZ = z;

		return this.vertexCount++;
	}

	/**
	 * Add a triangle wound counter-clockwise when seen from the side that
	 * (fx, fy, fz) points to, swapping two corners if needed.
	 */
	triFacing (a: number, b: number, c: number, fx: number, fy: number, fz: number): void {
		const p = this.positions;
		const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
		const e1x = p[b * 3] - ax, e1y = p[b * 3 + 1] - ay, e1z = p[b * 3 + 2] - az;
		const e2x = p[c * 3] - ax, e2y = p[c * 3 + 1] - ay, e2z = p[c * 3 + 2] - az;
		const nx = e1y * e2z - e1z * e2y;
		const ny = e1z * e2x - e1x * e2z;
		const nz = e1x * e2y - e1y * e2x;
		if (nx * fx + ny * fy + nz * fz < 0) this._tri(a, c, b);
		else this._tri(a, b, c);
	}

	/** Quad a-b-c-d (in order around its edge) facing (fx, fy, fz). */
	quadFacing (a: number, b: number, c: number, d: number, fx: number, fy: number, fz: number): void {
		this.triFacing(a, b, c, fx, fy, fz);
		this.triFacing(a, c, d, fx, fy, fz);
	}

	/**
	 * Flat-shaded triangle with its own three vertices. The face normal is
	 * oriented away from the interior point (ix, iy, iz) of the solid it
	 * belongs to.
	 */
	flatTri (
		x0: number, y0: number, z0: number,
		x1: number, y1: number, z1: number,
		x2: number, y2: number, z2: number,
		ix: number, iy: number, iz: number,
		u: number, v: number
	): void {
		const e1x = x1 - x0, e1y = y1 - y0, e1z = z1 - z0;
		const e2x = x2 - x0, e2y = y2 - y0, e2z = z2 - z0;
		let nx = e1y * e2z - e1z * e2y;
		let ny = e1z * e2x - e1x * e2z;
		let nz = e1x * e2y - e1y * e2x;
		const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
		nx /= len;
		ny /= len;
		nz /= len;

		const cx = (x0 + x1 + x2) / 3 - ix, cy = (y0 + y1 + y2) / 3 - iy, cz = (z0 + z1 + z2) / 3 - iz;
		const flip = nx * cx + ny * cy + nz * cz < 0;
		if (flip) {
			nx = -nx;
			ny = -ny;
			nz = -nz;
		}

		const a = this.vertex(x0, y0, z0, nx, ny, nz, u, v);
		const b = this.vertex(x1, y1, z1, nx, ny, nz, u, v);
		const c = this.vertex(x2, y2, z2, nx, ny, nz, u, v);
		if (flip) this._tri(a, c, b);
		else this._tri(a, b, c);
	}

	/** Copy the mesh out as engine geometry data (16-bit indices when they fit). */
	toGeometry (id: string): IgeGeometryData3d {
		const vc = this.vertexCount;
		const indices = vc <= 65535 ? Uint16Array.from(this.indices.subarray(0, this.indexCount)) : this.indices.slice(0, this.indexCount);

		const hx = (this._maxX - this._minX) / 2, hy = (this._maxY - this._minY) / 2, hz = (this._maxZ - this._minZ) / 2;
		return {
			id,
			type: "vertexArr",
			vertices: this.positions.slice(0, vc * 3),
			normals: this.normals.slice(0, vc * 3),
			uvs: this.uvs.slice(0, vc * 2),
			indices,
			boundingBox: {
				min: [this._minX, this._minY, this._minZ],
				max: [this._maxX, this._maxY, this._maxZ]
			},
			boundingSphere: {
				center: [this._minX + hx, this._minY + hy, this._minZ + hz],
				radius: Math.sqrt(hx * hx + hy * hy + hz * hz)
			}
		};
	}

	protected _tri (a: number, b: number, c: number): void {
		if (this.indexCount + 3 > this.indices.length) {
			const next = new Uint32Array(this.indices.length * 2);
			next.set(this.indices);
			this.indices = next;
		}
		this.indices[this.indexCount++] = a;
		this.indices[this.indexCount++] = b;
		this.indices[this.indexCount++] = c;
	}

	protected _growVertices (): void {
		const grow = <T extends Float32Array>(src: T): T => {
			const next = new Float32Array(src.length * 2) as T;
			next.set(src);
			return next;
		};
		this.positions = grow(this.positions);
		this.normals = grow(this.normals);
		this.uvs = grow(this.uvs);
	}
}
