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
	side?: number;

	// PBR properties
	/** Metallic factor (0 = dielectric, 1 = metal) */
	metallic?: number;
	/** Roughness factor (0 = smooth, 1 = rough) */
	roughness?: number;
	/** Emissive color */
	emissiveColor?: { r: number; g: number; b: number };
	/** Emissive intensity multiplier */
	emissiveIntensity?: number;
}
