import { Building } from "./Building";
import { isClient } from "@/engine/clientServer";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";

export class Triangle extends Building {
	classId = "Triangle";

	constructor () {
		super();

		this.data("glowColor", "#00ff00").layer(1).width(50).height(50);

		if (isClient) {
			this.texture(ige.textures.get("triangleSmartTexture"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Triangle);
