import { IgeBaseRenderer, type IgeBaseRendererProps } from "@/engine/core/IgeBaseRenderer";
import type { IgeObject } from "@/engine/core/IgeObject";
import type { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/export/exports";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export interface IgeRenderer2dProps {
	containerElement?: IgeBaseRendererProps["containerElement"];
	canvasElement?: IgeBaseRendererProps["canvasElement"];
}

export class IgeRenderer2d extends IgeBaseRenderer {
	_canvasContext?: IgeCanvasRenderingContext2d;

	constructor ({ canvasElement, containerElement }: IgeRenderer2dProps) {
		super({ canvasElement, containerElement, mode: "2d" });
	}

	_getContext () {
		if (!this._canvasElement) {
			throw new Error("No canvas element was found when trying to get context");
		}
		this._canvasContext = this._canvasElement.getContext("2d") as CanvasRenderingContext2D;

		// If we didn't get a context, fail completely
		if (!this._canvasContext) {
			throw new Error(
				"Could not get canvas context, renderer unable to start. This is a critical error that means the engine cannot start."
			);
		}
	}

	_updateDevicePixelRatio () {
		super._updateDevicePixelRatio();

		// Scale the canvas context to account for the change
		this._canvasContext?.scale(this._devicePixelRatio, this._devicePixelRatio);
	}

	renderSceneGraph (arr: IgeObject[], bounds: IgePoint2d): boolean {
		const ctx = this._canvasContext;
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

	/**
	 * Clears the entire canvas.
	 */
	clear () {
		if (!(this._canvasElement && this._canvasContext)) return;
		this._canvasContext.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
	}
}
