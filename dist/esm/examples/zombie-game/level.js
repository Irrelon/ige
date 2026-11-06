import { IgeEntity } from "../../engine/core/IgeEntity.js"
/** Playable area inside the lobby walls. */
export const ARENA = { minX: -970, maxX: 970, minZ: -720, maxZ: 720 };
/**
 * Creates box geometry with arbitrary width, height, and depth.
 * Similar to IgePrimitiveGeometry.createCube but allows non-uniform dimensions.
 */
export function createBoxGeometry(w, h, d, id) {
    const hw = w / 2, hh = h / 2, hd = d / 2;
    // prettier-ignore
    const vertices = new Float32Array([
        // Front face (z = +hd)
        -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
        // Back face (z = -hd)
        hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd,
        // Top face (y = +hh)
        -hw, hh, hd, hw, hh, hd, hw, hh, -hd, -hw, hh, -hd,
        // Bottom face (y = -hh)
        -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd, -hw, -hh, hd,
        // Right face (x = +hw)
        hw, -hh, hd, hw, -hh, -hd, hw, hh, -hd, hw, hh, hd,
        // Left face (x = -hw)
        -hw, -hh, -hd, -hw, -hh, hd, -hw, hh, hd, -hw, hh, -hd,
    ]);
    // prettier-ignore
    const normals = new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]);
    // prettier-ignore
    const uvs = new Float32Array([
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
    ]);
    // prettier-ignore
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23,
    ]);
    return {
        id,
        type: "primitive",
        vertices,
        normals,
        uvs,
        indices,
        boundingBox: {
            min: [-hw, -hh, -hd],
            max: [hw, hh, hd]
        },
        boundingSphere: {
            center: [0, 0, 0],
            radius: Math.sqrt(hw * hw + hh * hh + hd * hd)
        }
    };
}
/**
 * Builds the hospital lobby from box geometry and returns the footprints of
 * the solid furniture so characters can be kept out of it.
 *
 * Layout (top-down, Y is up): floor on the XZ plane, walls around the edge
 * with an entrance gap at the front, a reception desk at the back, pillars,
 * benches along the side walls and a few tables.
 */
export function createHospitalLobby(scene) {
    const obstacles = [];
    const box = (id, w, h, d, x, y, z, color, solid = false, metallic = 0.0, roughness = 0.8) => {
        const entity = new IgeEntity();
        entity.id(id);
        entity._geometryData = createBoxGeometry(w, h, d, `${id}_geo`);
        entity._materialData = {
            color: { r: color.r, g: color.g, b: color.b, a: 1 },
            metallic,
            roughness
        };
        entity.translateTo(x, y, z);
        entity.mount(scene);
        if (solid) {
            obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        }
        return entity;
    };
    const floorColor = { r: 0.55, g: 0.56, b: 0.55 };
    const wallColor = { r: 0.7, g: 0.68, b: 0.62 };
    const pillarColor = { r: 0.55, g: 0.55, b: 0.55 };
    const deskColor = { r: 0.36, g: 0.23, b: 0.12 };
    const benchColor = { r: 0.25, g: 0.38, b: 0.45 };
    const doorFrameColor = { r: 0.4, g: 0.4, b: 0.38 };
    // Floor (XZ plane, thin in Y). It receives shadows but never casts them.
    box("floor", 2000, 4, 1500, 0, -2, 0, floorColor, false, 0.0, 0.9)._noShadowCast = true;
    // Walls
    box("wallBack", 2000, 300, 20, 0, 150, -750, wallColor);
    box("wallLeft", 20, 300, 1500, -1000, 150, 0, wallColor);
    box("wallRight", 20, 300, 1500, 1000, 150, 0, wallColor);
    box("wallFrontL", 700, 300, 20, -650, 150, 750, wallColor);
    box("wallFrontR", 700, 300, 20, 650, 150, 750, wallColor);
    box("wallFrontTop", 600, 100, 20, 0, 250, 750, wallColor);
    // Entrance door frames
    box("doorFrameL", 20, 200, 20, -300, 100, 750, doorFrameColor, false, 0.2, 0.5);
    box("doorFrameR", 20, 200, 20, 300, 100, 750, doorFrameColor, false, 0.2, 0.5);
    // Reception desk (at the back of the lobby)
    box("receptionDesk", 500, 100, 80, 0, 50, -500, deskColor, true, 0.1, 0.6);
    box("receptionTop", 500, 6, 80, 0, 103, -500, { r: 0.45, g: 0.32, b: 0.2 }, false, 0.1, 0.5);
    // Pillars (4 structural columns)
    const pillarPositions = [[-400, -300], [-400, 300], [400, -300], [400, 300]];
    for (let i = 0; i < pillarPositions.length; i++) {
        box(`pillar_${i}`, 50, 300, 50, pillarPositions[i][0], 150, pillarPositions[i][1], pillarColor, true, 0.1, 0.7);
    }
    // Benches along the side walls
    for (const [i, z] of [-200, 100, 400].entries()) {
        box(`benchL${i}`, 200, 50, 50, -850, 25, z, benchColor, true, 0.0, 0.7);
        box(`benchR${i}`, 200, 50, 50, 850, 25, z, benchColor, true, 0.0, 0.7);
    }
    // Tables / gurneys
    box("table1", 120, 80, 60, -300, 40, -100, { r: 0.7, g: 0.7, b: 0.72 }, true, 0.3, 0.5);
    box("table2", 120, 80, 60, 350, 40, 0, { r: 0.7, g: 0.7, b: 0.72 }, true, 0.3, 0.5);
    // Vending machine against the back wall and a bin by the entrance
    box("vendingMachine", 80, 180, 60, -600, 90, -700, { r: 0.2, g: 0.3, b: 0.6 }, true, 0.4, 0.4);
    box("trashCan", 40, 60, 40, 200, 30, 600, { r: 0.35, g: 0.35, b: 0.35 }, true, 0.3, 0.6);
    return obstacles;
}
/**
 * Push a circle (radius r at x, z) out of any obstacle footprints and keep
 * it inside the arena. Returns the corrected position.
 */
export function resolveLevelCollision(x, z, r, obstacles) {
    x = Math.min(ARENA.maxX - r, Math.max(ARENA.minX + r, x));
    z = Math.min(ARENA.maxZ - r, Math.max(ARENA.minZ + r, z));
    for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i];
        const cx = Math.min(o.maxX, Math.max(o.minX, x));
        const cz = Math.min(o.maxZ, Math.max(o.minZ, z));
        const dx = x - cx, dz = z - cz;
        const distSq = dx * dx + dz * dz;
        if (distSq >= r * r)
            continue;
        if (distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            x = cx + (dx / dist) * r;
            z = cz + (dz / dist) * r;
        }
        else {
            // Centre inside the box: push out along the shallowest axis
            const left = x - o.minX, right = o.maxX - x, back = z - o.minZ, front = o.maxZ - z;
            const m = Math.min(left, right, back, front);
            if (m === left)
                x = o.minX - r;
            else if (m === right)
                x = o.maxX + r;
            else if (m === back)
                z = o.minZ - r;
            else
                z = o.maxZ + r;
        }
    }
    return { x, z };
}
