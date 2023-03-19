import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
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
			this.texture(ige.textures.get("circle"));
		}
	}
}

registerClass(Circle);
