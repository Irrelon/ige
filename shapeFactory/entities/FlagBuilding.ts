import { registerClass } from "@/engine/igeClassStore";
import { Flag } from "./base/Flag";
import { IgeObject } from "@/engine/core/IgeObject";

export class FlagBuilding extends Flag {
	classId = "FlagBuilding";


	constructor (tileX: number = NaN, tileY: number = NaN) {
		super();
		this.tileX = tileX;
		this.tileY = tileY;

		this.layer(1);
		this.data("glowSize", 30);
		//this.data("glowIntensity", 1);

		if (this.isometric()) {
			this.bounds3d(10, 10, 20);
		}
	}

	streamCreateConstructorArgs () {
		return [this.tileX, this.tileY];
	}

	_mounted (obj: IgeObject) {
		super._mounted(obj);

		if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
			this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
		}
	}
}

registerClass(FlagBuilding);
