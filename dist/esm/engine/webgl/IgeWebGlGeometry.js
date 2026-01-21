import { IgeBaseClass } from "../core/IgeBaseClass.js"
/**
 * Geometry wrapper class for WebGL.
 * Encapsulates vertex and index buffers with their layouts.
 */
export class IgeWebGlGeometry extends IgeBaseClass {
    classId = "IgeWebGlGeometry";
    id;
    vertexBuffer = null;
    indexBuffer = null;
    vertexCount = 0;
    indexCount = 0;
    attributes = [];
    drawMode; // GL draw mode (TRIANGLES, TRIANGLE_STRIP, etc.)
    vertexData;
    indexData;
    // Skinning information
    isSkinned = false; // Whether this geometry has bone weights/indices
    skeletonId; // Reference to skeleton data ID
    constructor(id, drawMode) {
        super();
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
        this.vertexCount = count ?? data.length;
        return this;
    }
    /**
     * Set index data.
     */
    setIndexData(data, count) {
        this.indexData = data;
        this.indexCount = count ?? data.length;
        return this;
    }
}
