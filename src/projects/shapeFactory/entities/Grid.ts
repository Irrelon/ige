import { isClient } from "@/engine/clientServer";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";

export class Grid extends IgeEntity {
	classId = "Grid";
	spacing: number = 100;

	constructor () {
		super();
		this.width(1000);
		this.height(1000);

		if (isClient) {
			this.texture(ige.textures.get("gridSmartTexture"));
		}
	}
}
