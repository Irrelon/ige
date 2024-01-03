import { Building } from "./Building";
import { isClient } from "@/engine/clientServer";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";

export class Flag extends Building {
	classId = "Flag";

	constructor () {
		super();

		this.data("glowColor", "#ffcc00").layer(1).width(10).height(20);

		if (isClient) {
			this.texture(ige.textures.get("flagSmartTexture"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Flag);
