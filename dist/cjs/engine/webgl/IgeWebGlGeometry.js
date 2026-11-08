"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlGeometry = void 0;
const IgeBaseClass_1 = require("../core/IgeBaseClass.js");
/**
 * Geometry wrapper class for WebGL.
 * Encapsulates vertex and index buffers with their layouts.
 */
class IgeWebGlGeometry extends IgeBaseClass_1.IgeBaseClass {
    constructor(id, drawMode) {
        super();
        this.classId = "IgeWebGlGeometry";
        /** Unique number per GPU geometry (cheap identity for checksums). */
        this.uid = IgeWebGlGeometry._nextUid++;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.vertexCount = 0;
        this.indexCount = 0;
        this.attributes = [];
        /** GL index type for drawElements (UNSIGNED_SHORT or UNSIGNED_INT). */
        this.indexType = 0x1403;
        /** Whether the vertex buffer has an a_color attribute. */
        this.hasVertexColors = false;
        // Skinning information
        this.isSkinned = false; // Whether this geometry has bone weights/indices
        // Local-space bounding sphere used for frustum and shadow culling.
        // A radius of -1 means unknown (the item is never culled).
        this.boundsCenterX = 0;
        this.boundsCenterY = 0;
        this.boundsCenterZ = 0;
        this.boundsRadius = -1;
        // Radius of the mesh as authored. boundsRadius is padded for skinned
        // meshes so animated poses stay inside it; level-of-detail selection
        // uses this one, which roughly matches the model's visible size.
        this.meshRadius = -1;
        this.id = id;
        this.drawMode = drawMode;
    }
    /**
     * Add a vertex attribute descriptor.
     */
    addAttribute(name, size, type, normalized = false, stride = 0, offset = 0) {
        this.attributes.push({
            name,
            size,
            type,
            normalized,
            stride,
            offset
        });
        return this;
    }
    /**
     * Record the vertex count of the uploaded vertex buffer. The data
     * itself isn't kept: once on the GPU the CPU copy is only memory.
     */
    setVertexData(data, count) {
        this.vertexCount = count !== null && count !== void 0 ? count : data.length;
        return this;
    }
    /**
     * Record the index count and type of the uploaded index buffer (the
     * data itself isn't kept).
     */
    setIndexData(data, count) {
        this.indexType = data instanceof Uint32Array ? 0x1405 : 0x1403;
        this.indexCount = count !== null && count !== void 0 ? count : data.length;
        return this;
    }
}
exports.IgeWebGlGeometry = IgeWebGlGeometry;
IgeWebGlGeometry._nextUid = 1;
