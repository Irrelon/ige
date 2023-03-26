import { registerClass } from "@/engine/igeClassStore";
import { Flag } from "./base/Flag";

export class FlagBuilding extends Flag {
	classId = "FlagBuilding";

	constructor () {
		super();
		this.depth(1);
		this.data("glowSize", 30);
		//this.data("glowIntensity", 1);
	}
}

registerClass(FlagBuilding);
