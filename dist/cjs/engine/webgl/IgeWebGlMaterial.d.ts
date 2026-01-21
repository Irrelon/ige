import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeTexture } from "../core/IgeTexture.js"
/**
 * Material blend modes for transparency handling.
 */
export declare enum IgeMaterialBlendMode {
    Opaque = "opaque",
    Transparent = "transparent",
    Additive = "additive",
    Multiply = "multiply"
}
/**
 * Material cull modes for face culling.
 */
export declare enum IgeMaterialCullMode {
    None = "none",
    Front = "front",
    Back = "back"
}
/**
 * Base material class for WebGL rendering.
 * Defines the visual properties of surfaces.
 */
export declare class IgeWebGlMaterial extends IgeBaseClass {
    classId: string;
    protected _id: string;
    protected _name: string;
    protected _color: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    protected _diffuseTexture?: IgeTexture;
    protected _normalTexture?: IgeTexture;
    protected _emissiveTexture?: IgeTexture;
    protected _baseColorTextureData?: Blob;
    protected _baseColorTexCoord: number;
    _baseColorTextureId?: string;
    protected _emissiveColor: {
        r: number;
        g: number;
        b: number;
    };
    protected _emissiveIntensity: number;
    protected _blendMode: IgeMaterialBlendMode;
    protected _cullMode: IgeMaterialCullMode;
    protected _depthWrite: boolean;
    protected _depthTest: boolean;
    protected _customShader?: string;
    protected _dirty: boolean;
    constructor(id?: string);
    /**
     * Get the material ID.
     */
    id(): string;
    /**
     * Gets / sets the material name.
     */
    name(val?: string): string | this;
    /**
     * Gets / sets the base color.
     */
    color(r?: number, g?: number, b?: number, a?: number): {
        r: number;
        g: number;
        b: number;
        a: number;
    } | this;
    /**
     * Sets color from hex string (e.g., "#ff0000" or "ff0000").
     */
    colorHex(hex: string): this;
    /**
     * Gets / sets the diffuse (albedo) texture.
     */
    diffuseTexture(texture?: IgeTexture): IgeTexture | undefined | this;
    /**
     * Gets / sets the normal map texture.
     */
    normalTexture(texture?: IgeTexture): IgeTexture | undefined | this;
    /**
     * Gets / sets the emissive texture.
     */
    emissiveTexture(texture?: IgeTexture): IgeTexture | undefined | this;
    /**
     * Gets / sets the base color texture data (raw Blob from GLTF).
     */
    baseColorTextureData(data?: Blob, texCoord?: number): Blob | undefined | this;
    /**
     * Gets the base color texture coordinate set index.
     */
    baseColorTexCoord(): number;
    /**
     * Check if material has base color texture data.
     */
    hasBaseColorTexture(): boolean;
    /**
     * Gets / sets the emissive color.
     */
    emissiveColor(r?: number, g?: number, b?: number): {
        r: number;
        g: number;
        b: number;
    } | this;
    /**
     * Gets / sets the emissive intensity.
     */
    emissiveIntensity(val?: number): number | this;
    /**
     * Gets / sets the blend mode.
     */
    blendMode(mode?: IgeMaterialBlendMode): IgeMaterialBlendMode | this;
    /**
     * Gets / sets the cull mode.
     */
    cullMode(mode?: IgeMaterialCullMode): IgeMaterialCullMode | this;
    /**
     * Gets / sets whether depth writing is enabled.
     */
    depthWrite(val?: boolean): boolean | this;
    /**
     * Gets / sets whether depth testing is enabled.
     */
    depthTest(val?: boolean): boolean | this;
    /**
     * Check if material is transparent.
     */
    isTransparent(): boolean;
    /**
     * Check if material needs updating.
     */
    isDirty(): boolean;
    /**
     * Mark material as clean (after GPU upload).
     */
    markClean(): void;
    /**
     * Clone this material.
     */
    clone(): IgeWebGlMaterial;
}
/**
 * PBR (Physically Based Rendering) material with metallic-roughness workflow.
 */
export declare class IgeWebGlPBRMaterial extends IgeWebGlMaterial {
    classId: string;
    protected _metallic: number;
    protected _roughness: number;
    protected _ambientOcclusion: number;
    protected _metallicRoughnessTexture?: IgeTexture;
    protected _aoTexture?: IgeTexture;
    /**
     * Gets / sets the metallic value (0 = dielectric, 1 = metal).
     */
    metallic(val?: number): number | this;
    /**
     * Gets / sets the roughness value (0 = smooth, 1 = rough).
     */
    roughness(val?: number): number | this;
    /**
     * Gets / sets the ambient occlusion value.
     */
    ambientOcclusion(val?: number): number | this;
    /**
     * Gets / sets the metallic-roughness texture.
     * Green channel = roughness, Blue channel = metallic.
     */
    metallicRoughnessTexture(texture?: IgeTexture): IgeTexture | undefined | this;
    /**
     * Gets / sets the ambient occlusion texture.
     */
    aoTexture(texture?: IgeTexture): IgeTexture | undefined | this;
    /**
     * Clone this PBR material.
     */
    clone(): IgeWebGlPBRMaterial;
}
