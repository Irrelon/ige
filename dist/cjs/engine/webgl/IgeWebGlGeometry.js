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
