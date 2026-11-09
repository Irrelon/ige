import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import { modelBounds } from "@/engine/webgl/IgeModelParts";

/** A generated prop, as the import step records it in assets/props.json. */
export interface PropInfo {
	id: string;
	file: string;
	role: "prop" | "weapon";
}

/** Where a prop goes in the lobby: its height in world units, its turn about Y, and whether it can be knocked about. */
export interface PropPlacement {
	id: string;
	x: number;
	z: number;
	height: number;
	turn?: number;
	/** Knocked about by characters and swings (with physics); otherwise solid. */
	loose?: boolean;
	/** Decoration only: nothing collides with it. */
	decor?: boolean;
}

/**
 * Dressing for the hospital lobby, placed when the prop's model exists.
 * The lobby runs x -970..970 and z -720..720; the entrance is at +z,
 * between x -300 and 300, and the reception desk at z -500.
 */
export const LOBBY_PROPS: PropPlacement[] = [
	{ id: "prop_car_wreck", x: -700, z: 330, height: 110, turn: 0.45 },
	{ id: "prop_dumpster", x: 760, z: -610, height: 105, turn: 0 },
	{ id: "prop_barrier", x: -170, z: 645, height: 60, turn: 0.1 },
	{ id: "prop_barrier", x: 90, z: 665, height: 60, turn: -0.15 },
	{ id: "prop_sandbags", x: 650, z: 600, height: 55, turn: -0.6 },
	{ id: "prop_sandbags", x: -840, z: -560, height: 55, turn: 0.8 },
	{ id: "prop_barricade", x: 720, z: 300, height: 80, turn: 1.45 },
	{ id: "prop_barricade", x: -240, z: 240, height: 80, turn: 0.3 },
	{ id: "prop_barrel", x: -770, z: -110, height: 70, loose: true },
	{ id: "prop_barrel", x: -720, z: -60, height: 70, loose: true },
	{ id: "prop_barrel", x: 880, z: -420, height: 70, loose: true },
	{ id: "prop_barrel", x: 290, z: 380, height: 70, loose: true },
	{ id: "prop_cone", x: -110, z: 590, height: 40, loose: true },
	{ id: "prop_cone", x: 10, z: 560, height: 40, loose: true },
	{ id: "prop_cone", x: 150, z: 590, height: 40, loose: true },
	{ id: "prop_ammo", x: -560, z: -655, height: 28, turn: 0.2 },
	{ id: "prop_ammo", x: 560, z: -665, height: 28, turn: -0.4 },
	{ id: "prop_medkit", x: 0, z: -380, height: 26, turn: 0.3, decor: true }
];

/** A prop's model fitted to a size: scale and the offset that puts its base on the ground and centres it. */
export interface PropFit {
	scale: number;
	/** Bounds of the scaled model, relative to its base centre (world units). */
	half: { x: number; y: number; z: number };
	/** Where to put the model under its root so the base centre is at the root's origin. */
	offset: { x: number; y: number; z: number };
}

/** Scale a model to `height` world units tall, standing on the ground, centred on its footprint. */
export function fitProp (model: IgeGltfModel, height: number): PropFit {
	const { min, max } = modelBounds(model);
	const scale = height / Math.max(1e-6, max.y - min.y);
	return {
		scale,
		half: { x: ((max.x - min.x) * scale) / 2, y: ((max.y - min.y) * scale) / 2, z: ((max.z - min.z) * scale) / 2 },
		offset: { x: (-(min.x + max.x) / 2) * scale, y: -min.y * scale, z: (-(min.z + max.z) / 2) * scale }
	};
}

/** The entity that draws a prop under `root`, fitted by fitProp(). */
export function createPropModel (model: IgeGltfModel, fit: PropFit, root: IgeEntity): IgeEntity {
	return new IgeEntity()
		.model(model)
		.translateTo(fit.offset.x, fit.offset.y, fit.offset.z)
		.scaleTo(fit.scale, fit.scale, fit.scale)
		.mount(root);
}
