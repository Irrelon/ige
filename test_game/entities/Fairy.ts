import { Rotator } from "./Rotator";
import { isClient } from "../../engine/services/clientServer";
import { textures } from "../services/textures";
import { registerClass } from "../../engine/services/igeClassStore";

export class Fairy extends Rotator {
	classId = "Fairy";

	constructor (speed: number) {
		super(speed);

		if (isClient) {
			this.texture(textures.getTextureById("fairy"));
			this.debugTransforms();
		}
	}

	streamCreateData (allGood: boolean = false) {
		return [this._rSpeed];
	}
}

registerClass(Fairy);
