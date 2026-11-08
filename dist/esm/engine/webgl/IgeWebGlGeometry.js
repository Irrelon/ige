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
    /** GL index type for drawElements (UNSIGNED_SHORT or UNSIGNED_INT). */
    indexType = 0x1403;
    /** Whether the vertex buffer has an a_color attribute. */
    hasVertexColors = false;
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
     * Record the vertex count of the uploaded vertex buffer. The data
     * itself isn't kept: once on the GPU the CPU copy is only memory.
     */
    setVertexData(data, count) {
        this.vertexCount = count ?? data.length;
        return this;
    }
    /**
     * Record the index count and type of the uploaded index buffer (the
     * data itself isn't kept).
     */
    setIndexData(data, count) {
        this.indexType = data instanceof Uint32Array ? 0x1405 : 0x1403;
        this.indexCount = count ?? data.length;
        return this;
    }
}
