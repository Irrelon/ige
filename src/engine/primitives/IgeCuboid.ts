import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeCuboidSmartTexture } from "@/engine/textures/IgeCuboidSmartTexture";

export class IgeCuboid extends IgeEntity {
	classId = "IgeCuboid";

	constructor () {
		super();

		this.bounds3d(40, 40, 40);

		const tex = new IgeTexture("igeCuboidSmartTexture", IgeCuboidSmartTexture);
		this.texture(tex);
	}
}
