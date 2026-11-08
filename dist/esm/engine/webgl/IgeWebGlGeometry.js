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
    // Local-space bounding sphere used for frustum and shadow culling.
    // A radius of -1 means unknown (the item is never culled).
    boundsCenterX = 0;
    boundsCenterY = 0;
    boundsCenterZ = 0;
    boundsRadius = -1;
    // Radius of the mesh as authored. boundsRadius is padded for skinned
    // meshes so animated poses stay inside it; level-of-detail selection
    // uses this one, which roughly matches the model's visible size.
    meshRadius = -1;
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
