/**
 * Describes an abstract material that defines the properties
 * of the material that an entity should be rendered with. This
 * abstract data is used by the renderer to determine what to
 * "paint" for the entity it is assigned to.
 */
export interface IgeMaterial {
	url?: string;
	color?: string;
	meta?: Record<string, Record<string, any>>; // Holds metadata by renderer name e.g. {"webgl": { ...whatever }}
}
