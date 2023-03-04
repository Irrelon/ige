import IgeEntity from "../../engine/core/IgeEntity";
import { textures } from "../services/textures";

export class Circle extends IgeEntity {
	classId = 'Circle';

	constructor () {
		super();

		this.data("glowColor", "#c852ff")
			.depth(1)
			.width(50)
			.height(50)
			.texture(textures.getTextureById("circle"));
	}
}
