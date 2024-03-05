import { IgeBaseRenderer, type IgeBaseRendererProps } from "@/engine/core/IgeBaseRenderer";
import type { IgeObject } from "@/engine/core/IgeObject";
import type { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/export/exports";
import type { IgeCanvasRenderingContext3d } from "@/types/IgeCanvasRenderingContext3d";

export interface IgeRendererWebGPUProps {
	containerElement?: IgeBaseRendererProps["containerElement"];
	canvasElement?: IgeBaseRendererProps["canvasElement"];
}

export class IgeRendererWebGPU extends IgeBaseRenderer {
	_canvasContext?: IgeCanvasRenderingContext3d;
	_adapter: GPUAdapter | null = null;
	_device: GPUDevice | null = null;
	_textureFormat: GPUTextureFormat | null = null;

	constructor ({ canvasElement, containerElement }: IgeRendererWebGPUProps) {
		super({ canvasElement, containerElement, mode: "webgpu" });

		if (!navigator.gpu) {
			this.logError("Cannot start because `navigator.gpu` did not return a value");
		}
	}

	async _getAdaptor () {
		this._adapter = await navigator.gpu.requestAdapter();

		if (!this._adapter) {
			this.logError("Cannot start because adapter not returned from `navigator.gpu.requestAdapter()`");
		}
	}

	async _getDevice () {
		if (!this._adapter) {
			this.logError("Cannot get device because no adaptor is present");
			return;
		}

		this._device = await this._adapter.requestDevice();

		if (!this._device) {
			this.logError("Cannot start because device not returned from `adapter.requestDevice()`");
		}

		this._device.lost.then(() => {
			this.logError("GPU device has been lost");
			this._device = null;
			return null;
		});
	}

	_getContext () {
		if (!this._canvasElement) {
			throw new Error("No canvas element was found when trying to get context");
		}
		if (!this._adapter) return;
		if (!this._device) return;

		this._canvasContext = this._canvasElement.getContext("webgpu") as GPUCanvasContext;

		// If we didn't get a context, fail completely
		if (!this._canvasContext) {
			this.logError(
				"Could not get canvas context, renderer unable to start. This is a critical error that means the engine cannot start."
			);
			return;
		}

		this._textureFormat = navigator.gpu.getPreferredCanvasFormat();

		this._canvasContext.configure({
			device: this._device,
			format: this._textureFormat,
			alphaMode: "opaque"
		});
	}

	_getRectVert (width: number, height: number) {
		const vertexData = new Float32Array([
			0, 0,
			width, 0,

			0, height,
			width, height
		]);

		const indexData = new Uint32Array([
			0, 1, 2,
			2, 1, 3
		]);

		return {
			vertexData,
			indexData,
			numVertices: indexData.length
		};
	}

	renderSceneGraph (arr: IgeObject[], bounds: IgePoint2d): boolean {
		const ctx = this._canvasContext;
		if (!ctx) return false;

		let ts: number;
		let td: number;

		if (arr) {
			//ctx.save();
			//ctx.translate(bounds.x2, bounds.y2);
			//ctx.scale(this._globalScale.x, this._globalScale.y);
			let arrCount = arr.length;

			// Loop our viewports and call their tick methods
			if (ige.config.debug._timing) {
				while (arrCount--) {
					//ctx.save();
					ts = new Date().getTime();
					//arr[arrCount].tick(ctx);
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
					//ctx.restore();
				}
			} else {
				while (arrCount--) {
					//ctx.save();
					//arr[arrCount].tick(ctx);
					//ctx.restore();
					const entity = arr[arrCount];
				}
			}

			//ctx.restore();
		}

		return super.renderSceneGraph(arr, bounds);
	}

	/**
	 * Clears the entire canvas.
	 */
	clear () {
		if (!(this._canvasElement && this._canvasContext)) return;
		//this._canvasContext.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
	}
}
