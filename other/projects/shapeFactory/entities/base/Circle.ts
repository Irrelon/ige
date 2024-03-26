import { GameEntity } from "./GameEntity";
import { isClient } from "@/engine/clientServer";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";

export class Circle extends GameEntity {
	classId = "Circle";

	constructor () {
		super();

		this.data("glowColor", "#c852ff").width(50).height(50);

		if (isClient) {
			this.texture(ige.textures.get("circleSmartTexture"));
		}
	}
}

registerClass(Circle);
