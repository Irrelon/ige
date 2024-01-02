import { IgeEntity } from "../core/IgeEntity.js";
import { IgeTexture } from "../core/IgeTexture.js";
import { IgeCuboidSmartTexture } from "../textures/IgeCuboidSmartTexture.js";

export class IgeCuboid extends IgeEntity {
	classId = "IgeCuboid";
	constructor() {
		super();
		this.bounds3d(40, 40, 40);
		const tex = new IgeTexture("igeCuboidSmartTexture", IgeCuboidSmartTexture);
		this.texture(tex);
	}
}
