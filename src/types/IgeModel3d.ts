/**
 * This type defines the structure of the model data object.
 * The model data object holds information about a 3d model
 * that various renderers can use to render the entity to the
 * canvas. We don't care about the underlying requirements of
 * the renderer or the model format. We only want to record
 * what type of model the data object represents so that the
 * underlying renderer can take appropriate action with it.
 */
export interface IgeModel3d {
	type: "gltf" | "quad" | "vertices" | string;
	url?: string;
	data?: any;
	meta?: Record<string, Record<string, any>>; // Holds metadata by renderer name e.g. {"webgl": { ...whatever }}
}
