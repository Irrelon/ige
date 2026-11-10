import { CHARACTERS, RIDERS } from "./characters";
import { buildModel, type BuiltModel } from "./mesh";
import { PROPS } from "./props";

/**
 * The blocky art pack: every model it has, built from code on first use
 * (a few milliseconds each) and kept.
 */

export const BLOCKY_IDS: string[] = [...Object.keys(CHARACTERS), ...Object.keys(RIDERS), ...Object.keys(PROPS)];

const built = new Map<string, BuiltModel>();

export function blockyModel (id: string): BuiltModel | null {
	const have = built.get(id);
	if (have) return have;
	const rigged = CHARACTERS[id] ?? RIDERS[id];
	let model: BuiltModel | null = null;
	if (rigged) {
		const r = rigged();
		model = buildModel(r.vox, r.bones, r.clips);
	} else if (PROPS[id]) {
		model = buildModel(PROPS[id]());
	}
	if (model) built.set(id, model);
	return model;
}
