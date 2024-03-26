import { Building } from "./base/Building";
import { isClient } from "@/engine/clientServer";
import type { IgeObject } from "@/engine/core/IgeObject";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";

export class FlagBuilding extends Building {
	classId = "FlagBuilding";

	constructor (tileX: number = NaN, tileY: number = NaN) {
		super();
		this.tileX = tileX;
		this.tileY = tileY;

		this.layer(1);
		this.width(30);
		this.height(30);

		//this.data("glowColor", "#ffcc00");
		//this.data("glowSize", 30);
		//this.data("glowIntensity", 1);

		if (isClient) {
			this.texture(ige.textures.get("flag"));
			this.registerNetworkClass();
		}

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
