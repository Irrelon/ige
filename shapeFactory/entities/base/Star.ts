import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { Building } from "./Building";

export class Star extends Building {
	classId = 'Star';

	constructor () {
		super();

		this.data("glowColor", "#00ff00")
			.depth(1)
			.width(50)
			.height(50);

		if (isClient) {
			this.texture(ige.textures.get("star"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Star);
