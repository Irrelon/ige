import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import { UNEXPLORED } from "../fog";
import { CORNER_X, CORNER_Z, type HexLayout } from "../hex";
import type { HexMap } from "../mapGen";
import { MeshBuilder } from "../meshBuilder";
import { mulberry32 } from "../noise";
import type { TerrainSurface } from "../surface";
import { LAND_BEVEL, Terrain, TERRAIN_INFO } from "../terrain";

/**
 * Moving water: surf rolling in along every explored shore (tile style),
 * and rivers flowing down the channels between tiles. Each is one mesh
 * with a small tiling texture whose texture offset moves every frame (the
 * engine's material uvOffset), so the animation costs no geometry updates.
 */

/** Foam bands: soft white crests that repeat across the strip. */
function foamTexture (): IgeTexture {
	const w = 64, h = 256;
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const ctx = c.getContext("2d") as CanvasRenderingContext2D;
	const img = ctx.createImageData(w, h);
	const r = mulberry32(91);
	const wobble: number[] = [];
	for (let x = 0; x < w; x++) wobble.push(Math.sin((x / w) * Math.PI * 4) * 5 + Math.sin((x / w) * Math.PI * 10 + 1.3) * 2);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			// Two crests per repeat, each a sharp front with a soft trailing tail
			const p = (((y + wobble[x]) / h) * 2) % 1;
			const crest = p < 0.08 ? p / 0.08 : Math.exp(-(p - 0.08) * 7);
			const a = Math.max(0, Math.min(1, crest * 0.95 + (r() - 0.5) * 0.12));
			const o = (y * w + x) * 4;
			img.data[o] = 255;
			img.data[o + 1] = 255;
			img.data[o + 2] = 255;
			img.data[o + 3] = Math.round(a * 255);
		}
	}
	ctx.putImageData(img, 0, 0);
	const tex = new IgeTexture("hexRealms_foam");
	tex._setImage(c as never);
	return tex;
}

/** River water: deep blue with lighter ripples running along the flow (u). */
function riverTexture (): IgeTexture {
	const w = 128, h = 64;
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const ctx = c.getContext("2d") as CanvasRenderingContext2D;
	const img = ctx.createImageData(w, h);
	const r = mulberry32(17);
	const streaks: { y: number; phase: number; len: number; amp: number }[] = [];
	for (let k = 0; k < 14; k++) streaks.push({ y: r() * h, phase: r() * w, len: 10 + r() * 30, amp: 0.4 + r() * 0.6 });
	for (let y = 0; y < h; y++) {
		const across = Math.abs(y / h - 0.5) * 2; // 0 in the middle, 1 at the banks
		for (let x = 0; x < w; x++) {
			let light = 0;
			for (const s of streaks) {
				const dy = Math.abs(((y - s.y + h * 1.5) % h) - h / 2);
				if (dy > 1.6) continue;
				const dx = ((x - s.phase + w) % w) / s.len;
				if (dx < 1) light = Math.max(light, s.amp * Math.sin(dx * Math.PI) * (1 - dy / 1.6));
			}
			const o = (y * w + x) * 4;
			const base = [46 + 20 * across, 120 + 18 * across, 184 - 6 * across];
			img.data[o] = Math.min(255, base[0] + light * 150);
			img.data[o + 1] = Math.min(255, base[1] + light * 120);
			img.data[o + 2] = Math.min(255, base[2] + light * 70);
			img.data[o + 3] = 255;
		}
	}
	ctx.putImageData(img, 0, 0);
	const tex = new IgeTexture("hexRealms_river");
	tex._setImage(c as never);
	return tex;
}

export class WaterView {
	surf: IgeEntity;
	rivers: IgeEntity;
	protected _surfMaterial: IgeMaterialData & { uvOffset: { u: number; v: number } };
	protected _riverMaterial: IgeMaterialData & { uvOffset: { u: number; v: number } };
	protected _renderer: IgeWebGlRenderer;
	protected _surfId: string | null = null;
	protected _riverId: string | null = null;
	protected _uid = 0;
	protected _lastFrame = -1;
	dirty = true;

	constructor (renderer: IgeWebGlRenderer, layer: IgeEntity) {
		this._renderer = renderer;
		this._surfMaterial = { color: { r: 1, g: 1, b: 1, a: 0.85 }, transparent: true, roughness: 0.4, emissiveColor: { r: 0.35, g: 0.42, b: 0.48 }, emissiveIntensity: 1, uvOffset: { u: 0, v: 0 } };
		this._riverMaterial = { color: { r: 1, g: 1, b: 1, a: 1 }, transparent: true, roughness: 0.25, uvOffset: { u: 0, v: 0 } };
		this.surf = new IgeEntity().id("hexRealms_surf");
		this.surf._materialData = this._surfMaterial;
		this.surf._noShadowCast = true;
		this.surf.texture(foamTexture());
		this.surf.mount(layer).hide();
		this.rivers = new IgeEntity().id("hexRealms_rivers");
		this.rivers._materialData = this._riverMaterial;
		this.rivers._noShadowCast = true;
		this.rivers.texture(riverTexture());
		this.rivers.mount(layer).hide();
	}

	/** Rebuild the surf and rivers for what the player has explored. */
	rebuild (map: HexMap, layout: HexLayout, surface: TerrainSurface, view: Uint8Array): void {
		this.dirty = false;
		const natural = surface.style === "natural";
		this._surfId = this._swap(this.surf, natural ? null : buildSurf(map, layout, view), this._surfId, "surf");
		this._riverId = this._swap(this.rivers, buildRivers(map, layout, surface, view), this._riverId, "river");
	}

	protected _swap (entity: IgeEntity, b: MeshBuilder | null, oldId: string | null, name: string): string | null {
		if (!b || !b.vertexCount) {
			entity.hide();
			if (oldId) this._renderer.releaseGeometry(oldId);
			return null;
		}
		const id = `hexRealms_${name}_${++this._uid}`;
		entity._geometryData = b.toGeometry(id);
		entity.show();
		if (oldId) this._renderer.releaseGeometry(oldId);
		return id;
	}

	/**
	 * Move the water on. Returns true when a new frame should be drawn (about
	 * 30 a second while there is water to animate).
	 */
	update (time: number): boolean {
		if (!this._surfId && !this._riverId) return false;
		const frame = Math.floor(time * 30);
		if (frame === this._lastFrame) return false;
		this._lastFrame = frame;
		// Surf rolls toward the shore; rivers flow downstream
		this._surfMaterial.uvOffset.v = (time * 0.16) % 1;
		this._surfMaterial.uvOffset.u = Math.sin(time * 0.3) * 0.05;
		this._riverMaterial.uvOffset.u = -((time * 0.22) % 1);
		return true;
	}
}

const isWater = (map: HexMap, t: number) => t >= 0 && TERRAIN_INFO[map.terrain[t] as Terrain].water;
const isLand = (map: HexMap, t: number) => t >= 0 && !TERRAIN_INFO[map.terrain[t] as Terrain].water;

/**
 * Surf strips on coastal water: along each edge that faces land, a band
 * from the shore inward. v runs from the shore (0) inward, so scrolling it
 * moves the foam crests in; vertex alpha fades the band out away from shore.
 */
function buildSurf (map: HexMap, layout: HexLayout, view: Uint8Array): MeshBuilder {
	const b = new MeshBuilder();
	const R = layout.size;
	const inner = 0.5;
	for (let t = 0; t < map.count; t++) {
		if (!isWater(map, t) || map.terrain[t] === Terrain.Ice || view[t] === UNEXPLORED) continue;
		const cx = layout.centerX(map.col(t), map.row(t)), cz = layout.centerZ(map.row(t));
		const y = map.topHeight(t) + 0.35;
		for (let d = 0; d < 6; d++) {
			const n = map.neighbor(t, d);
			if (!isLand(map, n) || view[n] === UNEXPLORED) continue;
			const i = d, j = (d + 1) % 6;
			// Four corners of the band; the inner edge pulled toward the centre
			const ox0 = cx + CORNER_X[i] * R * 0.97, oz0 = cz + CORNER_Z[i] * R * 0.97;
			const ox1 = cx + CORNER_X[j] * R * 0.97, oz1 = cz + CORNER_Z[j] * R * 0.97;
			const ix0 = cx + CORNER_X[i] * R * inner, iz0 = cz + CORNER_Z[i] * R * inner;
			const ix1 = cx + CORNER_X[j] * R * inner, iz1 = cz + CORNER_Z[j] * R * inner;
			// Each edge gets its own phase, so the crests don't march in lockstep
			const phase = ((t * 7 + d * 3) % 11) / 11;
			b.tint(1, 1, 1, 1);
			const a0 = b.vertex(ox0, y, oz0, 0, 1, 0, 0, phase);
			const a1 = b.vertex(ox1, y, oz1, 0, 1, 0, 1.4, phase);
			b.tint(1, 1, 1, 0);
			const c1 = b.vertex(ix1, y, iz1, 0, 1, 0, 1.4, phase + 0.9);
			const c0 = b.vertex(ix0, y, iz0, 0, 1, 0, 0, phase + 0.9);
			b.quadFacing(a0, a1, c1, c0, 0, 1, 0);
		}
	}
	b.tint(1);
	return b;
}

/**
 * Rivers: each course from source to mouth becomes a smooth ribbon down
 * the channel between tiles (where both tiles' bevels meet), a little wider
 * toward the sea, fading at its banks; u runs downstream so scrolling it
 * makes the water flow. The mouth reaches out into the sea.
 */
function buildRivers (map: HexMap, layout: HexLayout, surface: TerrainSurface, view: Uint8Array): MeshBuilder | null {
	if (!map.riverCourses.length) return null;
	const b = new MeshBuilder();
	const R = layout.size;
	const natural = surface.style === "natural";
	const cornerPos = (t: number, i: number) => ({
		x: layout.centerX(map.col(t), map.row(t)) + CORNER_X[i] * R,
		z: layout.centerZ(map.row(t)) + CORNER_Z[i] * R
	});
	for (const course of map.riverCourses) {
		// Only the explored stretches show
		let pts = course.corners.filter(([t, i]) => {
			const n1 = map.neighbor(t, (i + 5) % 6), n2 = map.neighbor(t, i);
			return view[t] !== UNEXPLORED || (n1 >= 0 && view[n1] !== UNEXPLORED) || (n2 >= 0 && view[n2] !== UNEXPLORED);
		}).map(([t, i]) => cornerPos(t, i));
		if (pts.length < 2) continue;
		// Out into the sea at the mouth
		const last = pts[pts.length - 1], prev = pts[pts.length - 2];
		pts.push({ x: last.x + (last.x - prev.x) * 0.5, z: last.z + (last.z - prev.z) * 0.5 });
		// Smooth the corner-to-corner zigzag into a meander (Chaikin)
		for (let pass = 0; pass < 2; pass++) {
			const next = [pts[0]];
			for (let k = 0; k < pts.length - 1; k++) {
				const a = pts[k], c = pts[k + 1];
				next.push({ x: a.x * 0.75 + c.x * 0.25, z: a.z * 0.75 + c.z * 0.25 }, { x: a.x * 0.25 + c.x * 0.75, z: a.z * 0.25 + c.z * 0.75 });
			}
			next.push(pts[pts.length - 1]);
			pts = next;
		}
		let along = 0;
		let prevRow: number[] | null = null;
		const across = [-1, -0.55, 0, 0.55, 1];
		const alphas = [0, 1, 1, 1, 0];
		for (let k = 0; k < pts.length; k++) {
			const a = pts[Math.max(0, k - 1)], c = pts[Math.min(pts.length - 1, k + 1)];
			let tx = c.x - a.x, tz = c.z - a.z;
			const tl = Math.hypot(tx, tz) || 1;
			tx /= tl;
			tz /= tl;
			if (k > 0) along += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
			const f = k / (pts.length - 1);
			const w = R * (0.13 + 0.07 * f);
			const p = pts[k];
			const row = across.map((s, ci) => {
				const x = p.x - tz * w * s, z = p.z + tx * w * s;
				// Tile style: in the channel where the two bevels meet; natural: on the ground
				const ground = natural ? surface.heightAt(x, z) + 1.2 : Math.max(surface.heightAt(x, z) - LAND_BEVEL * 0.3, 3.3);
				b.tint(1, 1, 1, alphas[ci]);
				return b.vertex(x, ground, z, 0, 1, 0, along / (R * 1.1), (s + 1) / 2);
			});
			if (prevRow) for (let ci = 0; ci < across.length - 1; ci++) b.quadFacing(prevRow[ci], row[ci], row[ci + 1], prevRow[ci + 1], 0, 1, 0);
			prevRow = row;
		}
	}
	b.tint(1);
	return b;
}
