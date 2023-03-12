import { ige } from "../../../engine/instance";
import { isClient } from "../../../engine/services/clientServer";
import { registerClass } from "../../../engine/services/igeClassStore";
import { Building } from "./Building";

export class Square extends Building {
	classId = 'Square';

	constructor () {
		super();

		this.data("glowColor", "#00d0ff")
			.depth(1)
			.width(50)
			.height(50);

		if (isClient) {
			this.texture(ige.textures.get("square"));
			this.registerNetworkClass();
		}
	}
}

registerClass(Square);
