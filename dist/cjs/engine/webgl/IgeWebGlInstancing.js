"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlBonePalette = exports.IgeWebGlInstanceBuffer = exports.INSTANCE_FLOATS = exports.IgeWebGlItemBatcher = void 0;
const IgeSkeletonData_1 = require("../../types/IgeSkeletonData.js");
/**
 * Groups render items into batches by a caller-supplied key. Batch objects
 * and their item arrays are reused across frames to keep the per-frame
 * allocation count near zero.
 */
class IgeWebGlItemBatcher {
    constructor() {
        this._batchMap = new Map();
        this._active = [];
    }
    /** Batches that received at least one item since the last begin(). */
    get batches() {
        return this._active;
    }
    begin() {
        for (let i = 0; i < this._active.length; i++) {
            this._active[i].items.length = 0;
        }
        this._active.length = 0;
    }
    add(item, key) {
        let batch = this._batchMap.get(key);
        if (!batch) {
            batch = {
                key,
                geometry: item.geometry,
                blobTextureId: item.blobTextureId,
                texture: item.texture,
                skinned: item.geometry.isSkinned && !!item.skeleton,
                items: []
            };
            this._batchMap.set(key, batch);
        }
        if (batch.items.length === 0) {
            // Refresh the shared state in case the batch object was reused for
            // a different geometry instance with the same key.
            batch.geometry = item.geometry;
            batch.blobTextureId = item.blobTextureId;
            batch.texture = item.texture;
            batch.skinned = item.geometry.isSkinned && !!item.skeleton;
            this._active.push(batch);
        }
        batch.items.push(item);
    }
    /** Drop all cached batch objects (e.g. after a context loss). */
    clear() {
        this._batchMap.clear();
        this._active.length = 0;
    }
}
exports.IgeWebGlItemBatcher = IgeWebGlItemBatcher;
/** Floats per instance: mat4 world + colour + emissive + material. */
exports.INSTANCE_FLOATS = 28;
const INSTANCE_STRIDE = exports.INSTANCE_FLOATS * 4;
const INSTANCE_ATTRIBUTES = [
    { name: "a_instanceMatrix0", offset: 0 },
    { name: "a_instanceMatrix1", offset: 16 },
    { name: "a_instanceMatrix2", offset: 32 },
    { name: "a_instanceMatrix3", offset: 48 },
    { name: "a_instanceColor", offset: 64 },
    { name: "a_instanceEmissive", offset: 80 },
    { name: "a_instanceMaterial", offset: 96 }
];
/**
 * Streams per-instance data (world matrix + material values) for instanced
 * draws. The buffer is re-specified for every batch, which lets the driver
 * orphan the previous storage instead of stalling on in-flight draws.
 */
class IgeWebGlInstanceBuffer {
    constructor(gl) {
        this._data = new Float32Array(exports.INSTANCE_FLOATS * 256);
        this._boundLocations = [];
        this._gl = gl;
        this._buffer = gl.createBuffer();
    }
    /**
     * Write the instance data for a list of items into the GPU buffer.
     */
    upload(items, start, count) {
        const needed = count * exports.INSTANCE_FLOATS;
        if (this._data.length < needed) {
            let size = this._data.length;
            while (size < needed)
                size *= 2;
            this._data = new Float32Array(size);
        }
        const data = this._data;
        let o = 0;
        for (let i = start; i < start + count; i++) {
            const item = items[i];
            const m = item.worldMatrix;
            const mat = item.material;
            for (let j = 0; j < 16; j++)
                data[o + j] = m[j];
            data[o + 16] = mat.r;
            data[o + 17] = mat.g;
            data[o + 18] = mat.b;
            data[o + 19] = mat.a;
            data[o + 20] = mat.emissiveR;
            data[o + 21] = mat.emissiveG;
            data[o + 22] = mat.emissiveB;
            data[o + 23] = mat.emissiveIntensity;
            data[o + 24] = mat.metallic;
            data[o + 25] = mat.roughness;
            data[o + 26] = mat.opacity;
            data[o + 27] = item.boneRow;
            o += exports.INSTANCE_FLOATS;
        }
        const gl = this._gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, needed), gl.STREAM_DRAW);
    }
    /**
     * Point the program's instance attributes at the buffer (divisor 1).
     * Must be called after upload() and after the geometry's own attributes
     * have been bound, since this rebinds ARRAY_BUFFER.
     */
    bind(program) {
        const gl = this._gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        this._boundLocations.length = 0;
        for (let i = 0; i < INSTANCE_ATTRIBUTES.length; i++) {
            const attr = INSTANCE_ATTRIBUTES[i];
            const location = program.getAttributeLocation(attr.name);
            if (location === -1)
                continue;
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, 4, gl.FLOAT, false, INSTANCE_STRIDE, attr.offset);
            gl.vertexAttribDivisor(location, 1);
            this._boundLocations.push(location);
        }
    }
    /**
     * Reset divisors and disable the instance attributes. Divisor state is
     * global per attribute index (no VAOs are in use), so leaving it set
     * would corrupt later non-instanced draws that reuse the index.
     */
    unbind() {
        const gl = this._gl;
        for (let i = 0; i < this._boundLocations.length; i++) {
            const location = this._boundLocations[i];
            gl.vertexAttribDivisor(location, 0);
            gl.disableVertexAttribArray(location);
        }
        this._boundLocations.length = 0;
    }
    destroy() {
        if (this._buffer)
            this._gl.deleteBuffer(this._buffer);
        this._buffer = null;
    }
}
exports.IgeWebGlInstanceBuffer = IgeWebGlInstanceBuffer;
/**
 * Bone palette texture for instanced skinned meshes. Each skinned item that
 * is rendered this frame gets one row; each bone uses four RGBA32F texels
 * (the four columns of its skin matrix). The texture is uploaded once per
 * frame and shared by every viewport and shadow pass.
 */
class IgeWebGlBonePalette {
    constructor(gl) {
        this._height = 0;
        this._data = new Float32Array(0);
        this._rows = 0;
        this._uploadedRows = 0;
        this._gl = gl;
        this._texture = gl.createTexture();
    }
    get texture() {
        return this._texture;
    }
    get width() {
        return IgeWebGlBonePalette.WIDTH;
    }
    get height() {
        return this._height;
    }
    /** Start a new frame; rows are reassigned from zero. */
    begin() {
        this._rows = 0;
        this._uploadedRows = 0;
    }
    /**
     * Copy a skeleton's skin matrices into the next free row and return the
     * row index for the instance attribute.
     */
    addSkeleton(skeleton) {
        const row = this._rows++;
        const rowFloats = IgeWebGlBonePalette.WIDTH * 4;
        const needed = (row + 1) * rowFloats;
        if (this._data.length < needed) {
            let rows = Math.max(16, this._data.length / rowFloats);
            while (rows * rowFloats < needed)
                rows *= 2;
            const next = new Float32Array(rows * rowFloats);
            next.set(this._data);
            this._data = next;
        }
        const boneFloats = Math.min(skeleton.data.boneCount, IgeSkeletonData_1.MAX_BONES) * 16;
        this._data.set(skeleton.skinMatrices.subarray(0, boneFloats), row * rowFloats);
        return row;
    }
    /**
     * Upload any rows written since the last upload, growing the texture
     * when needed. Binds the texture to `unit` as a side effect.
     */
    upload(unit) {
        const gl = this._gl;
        const rowFloats = IgeWebGlBonePalette.WIDTH * 4;
        const rowsNeeded = Math.max(1, this._rows);
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        if (rowsNeeded > this._height) {
            let height = Math.max(16, this._height);
            while (height < rowsNeeded)
                height *= 2;
            this._height = height;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, IgeWebGlBonePalette.WIDTH, height, 0, gl.RGBA, gl.FLOAT, null);
            this._uploadedRows = 0;
        }
        if (this._rows > this._uploadedRows) {
            const first = this._uploadedRows;
            const count = this._rows - first;
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, first, IgeWebGlBonePalette.WIDTH, count, gl.RGBA, gl.FLOAT, this._data.subarray(first * rowFloats, (first + count) * rowFloats));
            this._uploadedRows = this._rows;
        }
    }
    destroy() {
        if (this._texture)
            this._gl.deleteTexture(this._texture);
        this._texture = null;
    }
}
exports.IgeWebGlBonePalette = IgeWebGlBonePalette;
/** Texels per row (4 per bone). */
IgeWebGlBonePalette.WIDTH = IgeSkeletonData_1.MAX_BONES * 4;
