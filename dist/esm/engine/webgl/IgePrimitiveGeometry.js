/**
 * Utility class for generating primitive 3D geometries.
 */
export class IgePrimitiveGeometry {
    /**
     * Create a cube geometry with proper normals for lighting.
     * @param size The size of the cube (default 1)
     * @param id Optional ID for the geometry
     */
    static createCube(size = 1, id) {
        const s = size / 2;
        // Each face has 4 vertices with proper normals (6 faces * 4 vertices = 24 vertices)
        // prettier-ignore
        const vertices = new Float32Array([
            // Front face (z = +s, normal = 0, 0, 1)
            -s, -s, s,
            s, -s, s,
            s, s, s,
            -s, s, s,
            // Back face (z = -s, normal = 0, 0, -1)
            s, -s, -s,
            -s, -s, -s,
            -s, s, -s,
            s, s, -s,
            // Top face (y = +s, normal = 0, 1, 0)
            -s, s, s,
            s, s, s,
            s, s, -s,
            -s, s, -s,
            // Bottom face (y = -s, normal = 0, -1, 0)
            -s, -s, -s,
            s, -s, -s,
            s, -s, s,
            -s, -s, s,
            // Right face (x = +s, normal = 1, 0, 0)
            s, -s, s,
            s, -s, -s,
            s, s, -s,
            s, s, s,
            // Left face (x = -s, normal = -1, 0, 0)
            -s, -s, -s,
            -s, -s, s,
            -s, s, s,
            -s, s, -s,
        ]);
        // prettier-ignore
        const normals = new Float32Array([
            // Front face
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // Back face
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            // Top face
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // Bottom face
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // Right face
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // Left face
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        ]);
        // prettier-ignore
        const uvs = new Float32Array([
            // Front face
            0, 0, 1, 0, 1, 1, 0, 1,
            // Back face
            0, 0, 1, 0, 1, 1, 0, 1,
            // Top face
            0, 0, 1, 0, 1, 1, 0, 1,
            // Bottom face
            0, 0, 1, 0, 1, 1, 0, 1,
            // Right face
            0, 0, 1, 0, 1, 1, 0, 1,
            // Left face
            0, 0, 1, 0, 1, 1, 0, 1,
        ]);
        // Each face has 2 triangles (6 faces * 6 indices = 36 indices)
        // prettier-ignore
        const indices = new Uint16Array([
            // Front
            0, 1, 2, 0, 2, 3,
            // Back
            4, 5, 6, 4, 6, 7,
            // Top
            8, 9, 10, 8, 10, 11,
            // Bottom
            12, 13, 14, 12, 14, 15,
            // Right
            16, 17, 18, 16, 18, 19,
            // Left
            20, 21, 22, 20, 22, 23,
        ]);
        return {
            id: id || `cube_${Date.now()}`,
            type: "primitive",
            vertices,
            normals,
            uvs,
            indices,
            boundingBox: {
                min: [-s, -s, -s],
                max: [s, s, s]
            },
            boundingSphere: {
                center: [0, 0, 0],
                radius: Math.sqrt(3) * s
            }
        };
    }
    /**
     * Create a sphere geometry with proper normals for lighting.
     * @param radius The radius of the sphere (default 1)
     * @param segments Number of horizontal segments (default 16)
     * @param rings Number of vertical rings (default 16)
     * @param id Optional ID for the geometry
     */
    static createSphere(radius = 1, segments = 16, rings = 16, id) {
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        // Generate vertices
        for (let ring = 0; ring <= rings; ring++) {
            const phi = (ring / rings) * Math.PI; // 0 to PI
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            for (let seg = 0; seg <= segments; seg++) {
                const theta = (seg / segments) * Math.PI * 2; // 0 to 2PI
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                // Normal (pointing outward from center)
                const nx = sinPhi * cosTheta;
                const ny = cosPhi;
                const nz = sinPhi * sinTheta;
                // Position
                const x = radius * nx;
                const y = radius * ny;
                const z = radius * nz;
                // UV
                const u = seg / segments;
                const v = ring / rings;
                vertices.push(x, y, z);
                normals.push(nx, ny, nz);
                uvs.push(u, v);
            }
        }
        // Generate indices
        for (let ring = 0; ring < rings; ring++) {
            for (let seg = 0; seg < segments; seg++) {
                const curr = ring * (segments + 1) + seg;
                const next = curr + segments + 1;
                // Two triangles per quad
                indices.push(curr, next, curr + 1);
                indices.push(curr + 1, next, next + 1);
            }
        }
        return {
            id: id || `sphere_${Date.now()}`,
            type: "primitive",
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint16Array(indices),
            boundingBox: {
                min: [-radius, -radius, -radius],
                max: [radius, radius, radius]
            },
            boundingSphere: {
                center: [0, 0, 0],
                radius
            }
        };
    }
    /**
     * Create a plane geometry (quad) with proper normals.
     * @param width Width of the plane (default 1)
     * @param height Height of the plane (default 1)
     * @param id Optional ID for the geometry
     */
    static createPlane(width = 1, height = 1, id) {
        const hw = width / 2;
        const hh = height / 2;
        // prettier-ignore
        const vertices = new Float32Array([
            -hw, -hh, 0,
            hw, -hh, 0,
            hw, hh, 0,
            -hw, hh, 0,
        ]);
        // prettier-ignore
        const normals = new Float32Array([
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ]);
        // prettier-ignore
        const uvs = new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1,
        ]);
        // prettier-ignore
        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3,
        ]);
        return {
            id: id || `plane_${Date.now()}`,
            type: "primitive",
            vertices,
            normals,
            uvs,
            indices,
            boundingBox: {
                min: [-hw, -hh, 0],
                max: [hw, hh, 0]
            },
            boundingSphere: {
                center: [0, 0, 0],
                radius: Math.sqrt(hw * hw + hh * hh)
            }
        };
    }
}
