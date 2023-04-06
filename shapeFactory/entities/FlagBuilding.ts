import { registerClass } from "@/engine/igeClassStore";
import { Flag } from "./base/Flag";

export class FlagBuilding extends Flag {
	classId = "FlagBuilding";

	constructor () {
		super();
		this.layer(1);
		this.data("glowSize", 30);
		//this.data("glowIntensity", 1);

		if (this.isometric()) {
			this.bounds3d(10, 10, 20);
		}
	}
}

registerClass(FlagBuilding);
