import { Rotator } from "./Rotator";
import { isClient } from "../../engine/services/clientServer";
import { registerClass } from "../../engine/services/igeClassStore";
import { ige } from "../../engine/instance";

export class Fairy extends Rotator {
	classId = "Fairy";

	constructor (speed: number) {
		super(speed);

		if (isClient) {
			this.texture(ige.textures.get("fairy"));
		}
	}

	streamCreateData (allGood: boolean = false) {
		return [this._rSpeed];
	}
}

registerClass(Fairy);
