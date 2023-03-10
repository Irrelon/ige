import IgeEntity from "../../engine/core/IgeEntity";
import { textures } from "../services/textures";
import { isClient } from "../../engine/services/clientServer";
import { registerClass } from "../../engine/services/igeClassStore";

export class Triangle extends IgeEntity {
	classId = 'Triangle';

	constructor () {
		super();

		this.data("glowColor", "#00ff00")
			.depth(1)
			.width(50)
			.height(50);

		if (isClient) {
			this.texture(textures.getTextureById("triangle"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Triangle);