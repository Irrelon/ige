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
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.vertexCount = 0;
        this.indexCount = 0;
        this.attributes = [];
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
     * Set vertex data.
     */
    setVertexData(data, count) {
        this.vertexData = data;
        this.vertexCount = count !== null && count !== void 0 ? count : data.length;
        return this;
    }
    /**
     * Set index data.
     */
    setIndexData(data, count) {
        this.indexData = data;
        this.indexCount = count !== null && count !== void 0 ? count : data.length;
        return this;
    }
}
exports.IgeWebGlGeometry = IgeWebGlGeometry;
