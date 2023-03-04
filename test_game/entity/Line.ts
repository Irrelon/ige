import IgeEntity from "../../engine/core/IgeEntity";
import { textures } from "../services/textures";

export class Line extends IgeEntity {
	classId = 'Line';

	constructor (x1: number, y1: number, x2: number, y2: number) {
		super();
		// 0, 0, 250, -50
		// 250, -50, 220, 120
		this.data("glowColor", "#ffea00")
			.depth(0)
			.width(x2 - x1)
			.height(y2 - y1)
			.texture(textures.getTextureById("line"))
			.translateTo((x2 / 2) + (x1 / 2), (y2 / 2) + (y1 / 2), 0);
	}
}
