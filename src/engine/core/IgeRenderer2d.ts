import type { IgeObject } from "@/engine/core/IgeObject";
import type { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeRenderer } from "@/engine/core/IgeRenderer";
import { ige } from "@/engine/instance";

export class IgeRenderer2d extends IgeRenderer {
	_updateDevicePixelRatio () {
		super._updateDevicePixelRatio();

		// Scale the canvas context to account for the change
		this._canvasContext2d?.scale(this._devicePixelRatio, this._devicePixelRatio);
	}

	renderSceneGraph (arr: IgeObject[], bounds: IgePoint2d): boolean {
		const ctx = this._canvasContext2d;
		if (!ctx) return false;

		let ts: number;
		let td: number;

		if (arr) {
			ctx.save();
			ctx.translate(bounds.x2, bounds.y2);
			//ctx.scale(this._globalScale.x, this._globalScale.y);
			let arrCount = arr.length;

			// Loop our viewports and call their tick methods
			if (ige.config.debug._timing) {
				while (arrCount--) {
					ctx.save();
					ts = new Date().getTime();
					arr[arrCount].tick(ctx);
					td = new Date().getTime() - ts;
					if (arr[arrCount]) {
						if (!ige.engine._timeSpentInTick[arr[arrCount].id()]) {
							ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
						}

						if (!ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
							ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
						}

						ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
						ige.engine._timeSpentLastTick[arr[arrCount].id()].ms = td;
					}
					ctx.restore();
				}
			} else {
				while (arrCount--) {
					ctx.save();
					arr[arrCount].tick(ctx);
					ctx.restore();
				}
			}

			ctx.restore();
		}

		return super.renderSceneGraph(arr, bounds);
	}
}
