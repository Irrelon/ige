import { textures } from "../services/textures";
import { isClient } from "../../engine/services/clientServer";
import { registerClass } from "../../engine/services/igeClassStore";
import { GameEntity } from "./GameEntity";

export class Circle extends GameEntity {
	classId = 'Circle';

	constructor () {
		super();

		this.data("glowColor", "#c852ff")
			.depth(1)
			.width(50)
			.height(50);

		if (isClient) {
			this.texture(textures.getTextureById("circle"));
		}
	}
}

registerClass(Circle);
