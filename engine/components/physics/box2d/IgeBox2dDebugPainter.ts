import { ige } from "../../../instance";
import { IgeEntity } from "../../../core/IgeEntity";
import { IgeBox2dComponent } from "./IgeBox2dComponent";
import { registerClass } from "../../../services/igeClassStore";
import type { IgeCanvasRenderingContext2d } from "../../../../types/IgeCanvasRenderingContext2d";

export class IgeBox2dDebugPainter extends IgeEntity {
	classId = "IgeBox2dDebugPainter";
	_entity: IgeEntity;
	_options?: Record<any, any>;

	constructor (entity: IgeEntity, options?: Record<any, any>) {
		super();

		this._entity = entity;
		this._options = options;
	}

	tick (ctx: IgeCanvasRenderingContext2d) {
		if (this._parent && this._parent.isometricMounts()) {
			ctx.scale(1.414, 0.707); // This should be super-accurate now
			ctx.rotate((45 * Math.PI) / 180);
		}

		(ige.engine.components.box2d as IgeBox2dComponent)._world?.DrawDebugData();

		super.tick(ctx);
	}
}

registerClass(IgeBox2dDebugPainter);
