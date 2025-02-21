import type { IgeAbstractData3d } from "./IgeAbstractData3d.js"
/**
 * This type defines the structure of the mesh data object.
 * The mesh data object holds information about a 3d mesh
 * that various renderers can use to render the entity to the
 * canvas.
 *
 * The mesh is the combination of geometry and material.
 * E.g. You can have many sprites rendered into square geometry
 * (quads) and each sprite might need a different material that
 * points to a different image but underneath, they all share
 * the same geometry of a quad, so the mesh data object
 * represents the unique pairing of geometry and material.
 *
 * We don't care about the underlying requirements of
 * the renderer or the mesh format. We only want to record
 * what type of mesh the data object represents so that the
 * underlying renderer can take appropriate action with it.
 */
export interface IgeMeshData3d extends IgeAbstractData3d {
    id: string;
    type?: string;
    url?: string;
    data?: any;
}
