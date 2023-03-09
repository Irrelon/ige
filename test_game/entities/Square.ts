import IgeEntity from "../../engine/core/IgeEntity";
import { textures } from "../services/textures";
import { isClient } from "../../engine/services/clientServer";
import { registerClass } from "../../engine/services/igeClassStore";

export class Square extends IgeEntity {
	classId = 'Square';

	constructor () {
		super();

		this.data("glowColor", "#00d0ff")
			.depth(1)
			.width(50)
			.height(50);

		if (isClient) {
			this.texture(textures.getTextureById("square"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Square);
