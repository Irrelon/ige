import { Building } from "./Building";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "@/engine/instance";

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
