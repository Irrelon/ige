import { IgeEntity } from "@/export/exports";
import { IgeTexture } from "@/export/exports";
import { IgeCuboidSmartTexture } from "@/export/exports";

export class IgeCuboid extends IgeEntity {
	classId = "IgeCuboid";

	constructor () {
		super();

		this.bounds3d(40, 40, 40);

		const tex = new IgeTexture("igeCuboidSmartTexture", IgeCuboidSmartTexture);
		this.texture(tex);
	}
}
