import { textures } from "../services/textures";
import { isClient } from "../../engine/services/clientServer";
import { registerClass } from "../../engine/services/igeClassStore";
import { GameEntity } from "./GameEntity";

export class Triangle extends GameEntity {
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
