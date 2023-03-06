import IgeEntity from "../../engine/core/IgeEntity";
import { textures } from "../services/textures";
import { isClient } from "../../engine/services/clientServer";

export class Circle extends IgeEntity {
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
