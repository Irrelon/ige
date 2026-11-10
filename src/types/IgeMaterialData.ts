import type { IgeAbstractData3d } from "@/types/IgeAbstractData3d";

/**
 * RGBA color for PBR materials.
 */
export interface IgeMaterialColor {
	r: number;
	g: number;
	b: number;
	a?: number;
}

/**
 * Describes an abstract material that defines the properties
 * of the material that an entity should be rendered with. This
 * abstract data is used by the renderer to determine what to
 * "paint" for the entity it is assigned to.
 */
export interface IgeMaterialData extends IgeAbstractData3d {
	url?: string;
	/** Material color - can be a CSS string or RGBA object */
	color?: string | IgeMaterialColor;
	transparent?: boolean;
	/**
	 * How the object's colour combines with what is behind it. "additive"
	 * brightens (fire, sparks, magic, muzzle flashes) and is always drawn in
	 * the transparent pass. Defaults to normal alpha blending.
	 */
	blending?: "normal" | "additive";
	side?: number;
	/**
	 * Draw both sides of every triangle even when the renderer culls back
	 * faces (see IgeWebGlRenderer.backFaceCulling()), e.g. for leaves,
	 * cloth or single-sided planes. Set from glTF's doubleSided flag.
	 */
	doubleSided?: boolean;

	// PBR properties
	/** Metallic factor (0 = dielectric, 1 = metal) */
	metallic?: number;
	/** Roughness factor (0 = smooth, 1 = rough) */
	roughness?: number;
	/** Emissive color */
	emissiveColor?: { r: number; g: number; b: number };
	/** Emissive intensity multiplier */
	emissiveIntensity?: number;

	// Texture references
	/** ID of the base color/diffuse texture (loaded via TextureManager) */
	textureId?: string;
	/**
	 * Texture coordinate offset added after uvScale (uv * uvScale + uvOffset).
	 * Changing it each frame scrolls the texture: flowing water, moving clouds.
	 */
	uvOffset?: { u: number; v: number };
	/** Texture coordinate scale (repeats the texture across the surface). */
	uvScale?: { u: number; v: number };
	/**
	 * Encoded image for the base colour texture (e.g. from a GLB). When set
	 * with textureId, the WebGL renderer uploads it on first use and draws
	 * with plain white until the upload finishes.
	 */
	textureBlob?: Blob;
}
