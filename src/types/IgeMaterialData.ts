import type { IgeAbstractData3d } from "@/types/IgeAbstractData3d";

/**
 * Describes an abstract material that defines the properties
 * of the material that an entity should be rendered with. This
 * abstract data is used by the renderer to determine what to
 * "paint" for the entity it is assigned to.
 */
export interface IgeMaterialData extends IgeAbstractData3d {
	url?: string;
	color?: string;
}
