import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { Building } from "./Building";

export class Flag extends Building {
	classId = 'Flag';

	constructor () {
		super();

		this.data("glowColor", "#ffcc00")
			.depth(1)
			.width(10)
			.height(20);

		if (isClient) {
			this.texture(ige.textures.get("flagSmartTexture"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Flag);
