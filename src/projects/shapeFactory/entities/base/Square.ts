import { Building } from "./Building";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "@/engine/instance";

export class Square extends Building {
	classId = "Square";

	constructor() {
		super();

		this.data("glowColor", "#00d0ff").layer(1).width(50).height(50);

		if (isClient) {
			this.texture(ige.textures.get("squareSmartTexture"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Square);
