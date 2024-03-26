import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeScene2d } from "@/engine/core/IgeScene2d";
import { ige } from "@/engine/exports";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export class Target extends IgeEntity {
	classId = "Target";
	_targetEntity?: IgeEntity;

	constructor () {
		super();

		this.texture(ige.textures.get("target"))
			.width(50)
			.height(50)
			.mount(ige.$("frontScene") as IgeScene2d);
	}

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		if (this._targetEntity) {
			if (this._targetEntity.alive()) {
				this.translateToPoint(this._targetEntity._translate);
			} else {
				// Remove the target entity from the target as the target entity
				// is now dead
				this._targetEntity = undefined;
			}
		}

		super.update(ctx, tickDelta);
	}
}
