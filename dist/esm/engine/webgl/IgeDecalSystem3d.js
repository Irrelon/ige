import { IgeEntity } from "../core/IgeEntity.js"
/** Floats per decal in renderData(): x, y, z, size, r, g, b, a, rotation, cell, 0, 0. */
export const DECAL_INSTANCE_FLOATS = 12;
const DEFAULT_OPTIONS = {
    maxDecals: 256,
    lifetime: 30,
    fadeTime: 4,
    blending: "multiply",
    lift: 0.5
};
const DEFAULT_COLOR = { r: 0.45, g: 0.02, b: 0.02 };
/**
 * Flat marks on the ground (blood, scorch marks, footprints, spell
 * circles) drawn as textured quads lying on the XZ plane. Every decal in a
 * system is drawn with one instanced draw call per viewport, after opaque
 * geometry, so characters standing on a decal hide it correctly.
 *
 * Decals sit flat at the height given to add(), so they suit flat floors;
 * they are not projected onto walls or uneven terrain. Old decals fade
 * out after their lifetime, and when the system is full the oldest is
 * replaced.
 * @example #Leave blood where a zombie dies
 *     const blood = new IgeDecalSystem3d({ maxDecals: 300 }).mount(scene);
 *     blood.add(zombie._translate.x, zombie._translate.z, { size: 90 });
 */
export class IgeDecalSystem3d extends IgeEntity {
    classId = "IgeDecalSystem3d";
    /** Marker the renderer uses to recognise decal systems. */
    _isDecalSystem3d = true;
    _options;
    // Ring buffer of decals, oldest first from _head
    _head = 0;
    _count = 0;
    _decalData; // x, y, z, size, r, g, b, opacity, rotation, cell per decal
    _decalAge;
    /** Packed per-decal render data (oldest first), rebuilt when it changes. */
    _renderData;
    /** Incremented whenever _renderData changes (renderer upload check). */
    _renderVersion = 0;
    _dirty = false;
    /** World-space bounding sphere of the decals (for culling). */
    _boundsCenter = { x: 0, y: 0, z: 0 };
    _boundsRadius = 0;
    constructor(options = {}) {
        super();
        this._options = { ...DEFAULT_OPTIONS, ...options };
        const max = Math.max(1, Math.floor(this._options.maxDecals));
        this._options.maxDecals = max;
        this._decalData = new Float32Array(max * 10);
        this._decalAge = new Float32Array(max);
        this._renderData = new Float32Array(max * DECAL_INSTANCE_FLOATS);
        this._noShadowCast = true;
    }
    /** Cells per side of the atlas in use. */
    atlasGrid() {
        return this._options.atlasGrid ?? (this._options.texture ? 1 : 2);
    }
    /**
     * Add a decal at a world position on the ground.
     * @param x World X.
     * @param z World Z.
     */
    add(x, z, options = {}) {
        const max = this._options.maxDecals;
        let slot;
        if (this._count < max) {
            slot = (this._head + this._count) % max;
            this._count++;
        }
        else {
            // Full: replace the oldest
            slot = this._head;
            this._head = (this._head + 1) % max;
        }
        const grid = this.atlasGrid();
        const color = options.color || DEFAULT_COLOR;
        const d = this._decalData;
        const o = slot * 10;
        d[o] = x;
        d[o + 1] = (options.y ?? 0) + this._options.lift;
        d[o + 2] = z;
        d[o + 3] = options.size ?? 40;
        d[o + 4] = color.r;
        d[o + 5] = color.g;
        d[o + 6] = color.b;
        d[o + 7] = options.opacity ?? 0.9;
        d[o + 8] = options.rotation ?? Math.random() * Math.PI * 2;
        d[o + 9] = options.cell ?? Math.floor(Math.random() * grid * grid);
        this._decalAge[slot] = 0;
        this._dirty = true;
        return this;
    }
    /** Remove every decal. */
    clear() {
        this._head = 0;
        this._count = 0;
        this._dirty = true;
        return this;
    }
    /** Number of decals alive. */
    decalCount() {
        return this._count;
    }
    options(options) {
        if (options === undefined) {
            return this._options;
        }
        this._options = { ...this._options, ...options, maxDecals: this._options.maxDecals };
        this._dirty = true;
        return this;
    }
    update(tickDelta) {
        super.update(tickDelta);
        this._age(Math.min(tickDelta / 1000, 0.1));
    }
    /**
     * Returns the packed render data and decal count. Each decal uses
     * DECAL_INSTANCE_FLOATS floats: x, y, z, size, r, g, b, a, rotation,
     * atlas cell, 0, 0.
     */
    renderData() {
        return { data: this._renderData, count: this._count };
    }
    /**
     * Age decals, drop the expired ones and rebuild the render data when
     * anything visible changed (adds, removals or fading).
     */
    _age(dt) {
        const { lifetime, fadeTime, maxDecals: max } = this._options;
        const ages = this._decalAge;
        let fading = false;
        for (let i = 0; i < this._count; i++) {
            const slot = (this._head + i) % max;
            ages[slot] += dt;
            if (ages[slot] > lifetime)
                fading = true;
        }
        // Expired decals are always the oldest, at the head of the ring
        const end = lifetime + Math.max(fadeTime, 0);
        while (this._count > 0 && ages[this._head] >= end) {
            this._head = (this._head + 1) % max;
            this._count--;
            this._dirty = true;
        }
        if (this._dirty || fading) {
            this._rebuildRenderData();
            this._dirty = false;
        }
    }
    _rebuildRenderData() {
        const { lifetime, fadeTime, maxDecals: max } = this._options;
        const d = this._decalData;
        const out = this._renderData;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let maxSize = 0;
        for (let i = 0; i < this._count; i++) {
            const slot = (this._head + i) % max;
            const o = slot * 10;
            const r = i * DECAL_INSTANCE_FLOATS;
            const age = this._decalAge[slot];
            const fade = age > lifetime ? Math.max(0, 1 - (age - lifetime) / Math.max(fadeTime, 1e-6)) : 1;
            out[r] = d[o];
            out[r + 1] = d[o + 1];
            out[r + 2] = d[o + 2];
            out[r + 3] = d[o + 3];
            out[r + 4] = d[o + 4];
            out[r + 5] = d[o + 5];
            out[r + 6] = d[o + 6];
            out[r + 7] = d[o + 7] * fade;
            out[r + 8] = d[o + 8];
            out[r + 9] = d[o + 9];
            out[r + 10] = 0;
            out[r + 11] = 0;
            if (d[o] < minX)
                minX = d[o];
            if (d[o + 1] < minY)
                minY = d[o + 1];
            if (d[o + 2] < minZ)
                minZ = d[o + 2];
            if (d[o] > maxX)
                maxX = d[o];
            if (d[o + 1] > maxY)
                maxY = d[o + 1];
            if (d[o + 2] > maxZ)
                maxZ = d[o + 2];
            if (d[o + 3] > maxSize)
                maxSize = d[o + 3];
        }
        if (this._count > 0) {
            const c = this._boundsCenter;
            c.x = (minX + maxX) / 2;
            c.y = (minY + maxY) / 2;
            c.z = (minZ + maxZ) / 2;
            const dx = maxX - c.x, dy = maxY - c.y, dz = maxZ - c.z;
            this._boundsRadius = Math.sqrt(dx * dx + dy * dy + dz * dz) + maxSize * 0.71;
        }
        else {
            this._boundsRadius = 0;
        }
        this._renderVersion++;
    }
}
