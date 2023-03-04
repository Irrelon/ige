import IgeEntity from "../../engine/core/IgeEntity";
import { textures } from "../services/textures";

export class Triangle extends IgeEntity {
	classId = 'Triangle';

	constructor () {
		super();

		this.data("glowColor", "#00ff00")
			.depth(1)
			.width(50)
			.height(50)
			.texture(textures.getTextureById("triangle"));
	}
}
