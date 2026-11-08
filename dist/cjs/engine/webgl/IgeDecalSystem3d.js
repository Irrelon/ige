"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeDecalSystem3d = exports.DECAL_MESH_VERTEX_FLOATS = exports.DECAL_INSTANCE_FLOATS = void 0;
exports.collectDecalTargets = collectDecalTargets;
const IgeEntity_1 = require("../core/IgeEntity.js");
const sceneChange_1 = require("../utils/sceneChange.js");
const IgeDecalProjector_1 = require("./IgeDecalProjector.js");
/** Floats per decal in renderData(): x, y, z, size, r, g, b, a, rotation, cell, 0, 0. */
exports.DECAL_INSTANCE_FLOATS = 12;
/** Floats per vertex in meshRenderData(): x, y, z, u, v, r, g, b, a. */
exports.DECAL_MESH_VERTEX_FLOATS = 9;
const DEFAULT_OPTIONS = {
    maxDecals: 256,
    lifetime: 30,
    fadeTime: 4,
    blending: "multiply",
    lift: 0.5,
    maxProjected: 64
};
/** a * b for column-major 4x4 matrices. */
function multiplyMat4(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] +
                a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
        }
    }
    return out;
}
/**
 * The meshes of some entities and their descendants that a projected decal
 * can land on: plain geometry and the static parts of models. Hidden
 * entities and animated (skinned) parts are left out.
 */
function collectDecalTargets(targets) {
    const meshes = [];
    const visit = (entity) => {
        var _a, _b, _c;
        if (entity._hidden)
            return;
        if (typeof entity.updateTransform === "function")
            entity.updateTransform();
        const world = (_a = entity._worldMatrix4) === null || _a === void 0 ? void 0 : _a.matrix;
        if (world) {
            const parts = entity._modelParts;
            if (parts && parts.length > 0) {
                for (const part of parts) {
                    if (part.skinned || !((_b = part.geometryData) === null || _b === void 0 ? void 0 : _b.vertices))
                        continue;
                    meshes.push({ geometry: part.geometryData, matrix: part.matrix ? multiplyMat4(world, part.matrix) : world });
                }
            }
            else if ((_c = entity._geometryData) === null || _c === void 0 ? void 0 : _c.vertices) {
                meshes.push({ geometry: entity._geometryData, matrix: world });
            }
        }
        const children = entity._children;
        if (children) {
            for (const child of children)
                visit(child);
        }
    };
    for (const target of Array.isArray(targets) ? targets : [targets])
        visit(target);
    return meshes;
}
const DEFAULT_COLOR = { r: 0.45, g: 0.02, b: 0.02 };
/**
 * Flat marks on the ground (blood, scorch marks, footprints, spell
 * circles) drawn as textured quads lying on the XZ plane. Every decal in a
 * system is drawn with one instanced draw call per viewport, after opaque
 * geometry, so characters standing on a decal hide it correctly.
 *
 * add() lays a decal flat at a given height: the cheapest kind, for flat
 * floors. project() wraps one over the surfaces of chosen entities (walls,
 * slopes, steps, uneven terrain) by clipping their triangles to the
 * decal; each projected decal is a small mesh, drawn with its system's
 * other projected decals in one call. Old decals fade out after their
 * lifetime, and when the system is full the oldest is replaced.
 * @example #Leave blood where a zombie dies
 *     const blood = new IgeDecalSystem3d({ maxDecals: 300 }).mount(scene);
 *     blood.add(zombie._translate.x, zombie._translate.z, { size: 90 });
 * @example #Splash a wall (normal points out of the wall) or uneven ground
 *     blood.project({ x: 400, y: 60, z: -200 }, { x: 0, y: 0, z: 1 }, wall, { size: 70 });
 *     blood.project(hitPoint, { x: 0, y: 1, z: 0 }, terrain, { size: 90 });
 */
class IgeDecalSystem3d extends IgeEntity_1.IgeEntity {
    constructor(options = {}) {
        super();
        this.classId = "IgeDecalSystem3d";
        /** Marker the renderer uses to recognise decal systems. */
        this._isDecalSystem3d = true;
        // Ring buffer of decals, oldest first from _head
        this._head = 0;
        this._count = 0;
        /** Incremented whenever _renderData changes (renderer upload check). */
        this._renderVersion = 0;
        this._dirty = false;
        /** World-space bounding sphere of the decals (for culling). */
        this._boundsCenter = { x: 0, y: 0, z: 0 };
        this._boundsRadius = 0;
        // Projected decals, oldest first, and their packed vertices
        this._projected = [];
        this._meshRenderData = new Float32Array(0);
        this._meshVertexCount = 0;
        /** Incremented whenever _meshRenderData changes (renderer upload check). */
        this._meshRenderVersion = 0;
        this._meshDirty = false;
        this._meshBoundsCenter = { x: 0, y: 0, z: 0 };
        this._meshBoundsRadius = 0;
        this._options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        const max = Math.max(1, Math.floor(this._options.maxDecals));
        this._options.maxDecals = max;
        this._decalData = new Float32Array(max * 10);
        this._decalAge = new Float32Array(max);
        this._renderData = new Float32Array(max * exports.DECAL_INSTANCE_FLOATS);
        this._noShadowCast = true;
    }
    /** Cells per side of the atlas in use. */
    atlasGrid() {
        var _a;
        return (_a = this._options.atlasGrid) !== null && _a !== void 0 ? _a : (this._options.texture ? 1 : 2);
    }
    /**
     * Add a decal at a world position on the ground.
     * @param x World X.
     * @param z World Z.
     */
    add(x, z, options = {}) {
        var _a, _b, _c, _d, _e;
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
        d[o + 1] = ((_a = options.y) !== null && _a !== void 0 ? _a : 0) + this._options.lift;
        d[o + 2] = z;
        d[o + 3] = (_b = options.size) !== null && _b !== void 0 ? _b : 40;
        d[o + 4] = color.r;
        d[o + 5] = color.g;
        d[o + 6] = color.b;
        d[o + 7] = (_c = options.opacity) !== null && _c !== void 0 ? _c : 0.9;
        d[o + 8] = (_d = options.rotation) !== null && _d !== void 0 ? _d : Math.random() * Math.PI * 2;
        d[o + 9] = (_e = options.cell) !== null && _e !== void 0 ? _e : Math.floor(Math.random() * grid * grid);
        this._decalAge[slot] = 0;
        this._dirty = true;
        return this;
    }
    /**
     * Project a decal onto the surfaces of some entities and their
     * children: walls, slopes, steps, uneven terrain, props. Surfaces
     * facing the normal within the decal's box (size across, depth along
     * the normal) receive it; animated characters don't.
     * @param position World position of the decal's centre, on or near the surface.
     * @param normal Direction the decal faces: out of the surface (e.g. a
     * wall's normal, or the reverse of a shot's direction).
     * @param targets Entities whose meshes receive the decal.
     */
    project(position, normal, targets, options = {}) {
        var _a, _b, _c, _d, _e, _f;
        const size = (_a = options.size) !== null && _a !== void 0 ? _a : 40;
        const vertices = (0, IgeDecalProjector_1.projectDecal)(collectDecalTargets(targets), {
            position,
            normal,
            size,
            depth: (_b = options.depth) !== null && _b !== void 0 ? _b : size / 2,
            rotation: (_c = options.rotation) !== null && _c !== void 0 ? _c : Math.random() * Math.PI * 2,
            maxAngle: (((_d = options.maxAngle) !== null && _d !== void 0 ? _d : 75) * Math.PI) / 180,
            lift: this._options.lift
        });
        if (vertices.length === 0)
            return this;
        // Map decal UVs into the atlas cell
        const grid = this.atlasGrid();
        const cell = (_e = options.cell) !== null && _e !== void 0 ? _e : Math.floor(Math.random() * grid * grid);
        const cellX = cell % grid, cellY = Math.floor(cell / grid);
        for (let i = 0; i < vertices.length; i += IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS) {
            vertices[i + 3] = (vertices[i + 3] + cellX) / grid;
            vertices[i + 4] = (vertices[i + 4] + cellY) / grid;
        }
        const color = options.color || DEFAULT_COLOR;
        this._projected.push({ vertices, r: color.r, g: color.g, b: color.b, opacity: (_f = options.opacity) !== null && _f !== void 0 ? _f : 0.9, age: 0 });
        while (this._projected.length > Math.max(1, this._options.maxProjected))
            this._projected.shift();
        this._meshDirty = true;
        return this;
    }
    /** Remove every decal. */
    clear() {
        this._head = 0;
        this._count = 0;
        this._dirty = true;
        this._projected.length = 0;
        this._meshDirty = true;
        return this;
    }
    /** Number of flat decals alive. */
    decalCount() {
        return this._count;
    }
    /** Number of projected decals alive. */
    projectedCount() {
        return this._projected.length;
    }
    /**
     * Returns the packed projected decal triangles: DECAL_MESH_VERTEX_FLOATS
     * floats per vertex (x, y, z, u, v, r, g, b, a), three per triangle.
     */
    meshRenderData() {
        return { data: this._meshRenderData, vertexCount: this._meshVertexCount };
    }
    options(options) {
        if (options === undefined) {
            return this._options;
        }
        this._options = Object.assign(Object.assign(Object.assign({}, this._options), options), { maxDecals: this._options.maxDecals });
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
        // Projected decals (pushed in order, so the oldest are first)
        const projected = this._projected;
        let meshFading = false;
        for (const decal of projected) {
            decal.age += dt;
            if (decal.age > lifetime)
                meshFading = true;
        }
        while (projected.length > 0 && projected[0].age >= end) {
            projected.shift();
            this._meshDirty = true;
        }
        if (this._meshDirty || meshFading) {
            this._rebuildMeshRenderData();
            this._meshDirty = false;
        }
    }
    _rebuildMeshRenderData() {
        const { lifetime, fadeTime } = this._options;
        let vertexCount = 0;
        for (const decal of this._projected)
            vertexCount += decal.vertices.length / IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS;
        const needed = vertexCount * exports.DECAL_MESH_VERTEX_FLOATS;
        if (this._meshRenderData.length < needed) {
            this._meshRenderData = new Float32Array(Math.max(needed, this._meshRenderData.length * 2));
        }
        const out = this._meshRenderData;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let o = 0;
        for (const decal of this._projected) {
            const fade = decal.age > lifetime ? Math.max(0, 1 - (decal.age - lifetime) / Math.max(fadeTime, 1e-6)) : 1;
            const alpha = decal.opacity * fade;
            const v = decal.vertices;
            for (let i = 0; i < v.length; i += IgeDecalProjector_1.PROJECTED_DECAL_VERTEX_FLOATS) {
                const x = v[i], y = v[i + 1], z = v[i + 2];
                out[o] = x;
                out[o + 1] = y;
                out[o + 2] = z;
                out[o + 3] = v[i + 3];
                out[o + 4] = v[i + 4];
                out[o + 5] = decal.r;
                out[o + 6] = decal.g;
                out[o + 7] = decal.b;
                out[o + 8] = alpha;
                o += exports.DECAL_MESH_VERTEX_FLOATS;
                if (x < minX)
                    minX = x;
                if (y < minY)
                    minY = y;
                if (z < minZ)
                    minZ = z;
                if (x > maxX)
                    maxX = x;
                if (y > maxY)
                    maxY = y;
                if (z > maxZ)
                    maxZ = z;
            }
        }
        this._meshVertexCount = vertexCount;
        if (vertexCount > 0) {
            const c = this._meshBoundsCenter;
            c.x = (minX + maxX) / 2;
            c.y = (minY + maxY) / 2;
            c.z = (minZ + maxZ) / 2;
            this._meshBoundsRadius = Math.hypot(maxX - c.x, maxY - c.y, maxZ - c.z);
        }
        else {
            this._meshBoundsRadius = 0;
        }
        this._meshRenderVersion++;
        (0, sceneChange_1.markSceneChanged)();
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
            const r = i * exports.DECAL_INSTANCE_FLOATS;
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
        (0, sceneChange_1.markSceneChanged)();
    }
}
exports.IgeDecalSystem3d = IgeDecalSystem3d;
