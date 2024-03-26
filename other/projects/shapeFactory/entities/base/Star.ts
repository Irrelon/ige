import { Building } from "./Building";
import { isClient } from "@/engine/clientServer";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";

export class Star extends Building {
	classId = "Star";

	constructor () {
		super();

		this.data("glowColor", "#00ff00").layer(1).width(60).height(60);

		if (isClient) {
			this.texture(ige.textures.get("starSmartTexture"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Star);
