import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeWebGlResourceManager } from "./IgeWebGlResourceManager.js";
import { IgeWebGlGeometry } from "./IgeWebGlGeometry.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js";
/**
 * Manages geometry (VBO/IBO) creation and caching for WebGL renderer.
 */
export declare class IgeWebGlGeometryManager extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _resourceManager: IgeWebGlResourceManager;
    protected _geometries: Map<string, IgeWebGlGeometry>;
    protected _sharedQuadGeometry?: IgeWebGlGeometry;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, resourceManager: IgeWebGlResourceManager);
    /**
     * Create a shared quad geometry used by all 2D sprites.
     * Quad is 1x1 centered at origin, to be scaled by entity bounds.
     */
    protected _createSharedQuadGeometry(): void;
    /**
     * Get the shared quad geometry.
     */
    getSharedQuadGeometry(): IgeWebGlGeometry | undefined;
    /**
     * Create geometry from IgeGeometryData3d.
     */
    createGeometryFromData(geometryId: string, data: IgeGeometryData3d): IgeWebGlGeometry | null | undefined;
    /**
     * Get a cached geometry by id.
     */
    getGeometry(geometryId: string): IgeWebGlGeometry | undefined;
    /**
     * Check if a geometry exists.
     */
    hasGeometry(geometryId: string): boolean;
    /**
     * Delete a geometry and its buffers.
     */
    deleteGeometry(geometryId: string): void;
    /**
     * Bind a geometry's buffers and set up vertex attributes.
     */
    bindGeometry(geometry: IgeWebGlGeometry, program: {
        getAttributeLocation: (name: string) => number;
    }): void;
    /**
     * Unbind geometry buffers and disable vertex attributes.
     */
    unbindGeometry(geometry: IgeWebGlGeometry, program: {
        getAttributeLocation: (name: string) => number;
    }): void;
    /**
     * Draw a geometry.
     */
    drawGeometry(geometry: IgeWebGlGeometry): void;
    /**
     * Get statistics about managed geometries.
     */
    getStats(): {
        geometryCount: number;
        geometries: string[];
    };
    /**
     * Clean up all geometries.
     */
    cleanup(): void;
}
