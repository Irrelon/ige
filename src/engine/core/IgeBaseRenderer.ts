import { isServer } from "@/engine/clientServer";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgeObject } from "@/engine/core/IgeObject";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/export/exports";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeCanvasRenderingContext3d } from "@/types/IgeCanvasRenderingContext3d";
import type { IgeRendererMode } from "@/types/IgeRendererMode";

export interface IgeBaseRendererProps {
	canvasElement?: HTMLCanvasElement;
	containerElement?: HTMLElement; // If specified, appends the new canvas to this element instead of document.body
	mode: IgeRendererMode;
}

export class IgeBaseRenderer extends IgeEventingClass {
	_hasRunSetup: boolean = false;
	_isReady: boolean = false;
	_mode: IgeRendererMode;
	_containerElement?: HTMLElement;
	_canvasElement?: HTMLCanvasElement;
	_canvasContext?: IgeCanvasRenderingContext2d | IgeCanvasRenderingContext3d | null;
	_bounds2d: IgePoint2d = new IgePoint2d(40, 40);
	_autoSize: boolean = true;
	_devicePixelRatio: number = 1;
	_resized: boolean = false;

	constructor ({ canvasElement, containerElement, mode }: IgeBaseRendererProps) {
		super();

		this._containerElement = containerElement;
		this._canvasElement = canvasElement;
		this._mode = mode;

		this.log("++++++++++ Renderer Instantiated");
	}

	isReady () {
		return this._isReady;
	}

	async setup () {
		// Don't run setup on server, we don't render on the server,
		// so we don't need a canvas or rendering backend!
		if (isServer) return;

		// Check if we've already run setup before
		if (this._hasRunSetup) return;

		await this._getAdaptor();
		await this._getDevice();
		this._createCanvas();
		this._updateDevicePixelRatio();
		this._getContext();
		this._addEventListeners();
		this._resizeEvent();

		ige.engine._headless = false;
		this._isReady = true;

		this.log("Setup executed");
	}

	async _getAdaptor () {}

	async _getDevice () {}

	_createCanvas () {
		// Create a new canvas element to use as the
		// rendering front-buffer
		this._canvasElement = document.createElement("canvas");
		this._canvasElement.className = "igeRendererOutput";

		(this._containerElement || document.body).appendChild(this._canvasElement);
	}

	_getContext () {}

	_addEventListeners () {
		window.addEventListener("resize", this._resizeEvent);
	}

	_removeEventListeners () {
		window.removeEventListener("resize", this._resizeEvent);
	}

	destroy () {
		this._removeEventListeners();
	}

	/**
	 * Gets the bounding rectangle for the HTML canvas element being
	 * used as the front buffer for the engine. Uses DOM methods.
	 * @private
	 */
	_getCanvasElementPosition () {
		if (!this._canvasElement) {
			return {
				top: 0,
				left: 0
			};
		}

		try {
			return this._canvasElement.getBoundingClientRect();
		} catch (e) {
			return {
				top: this._canvasElement.offsetTop,
				left: this._canvasElement.offsetLeft
			};
		}
	}

	_updateDevicePixelRatio () {
		if (!this._canvasElement) return;

		if (ige.engine._pixelRatioScaling) {
			// Support high-definition devices and "retina" displays by adjusting
			// for device and back store pixels ratios
			this._devicePixelRatio = window.devicePixelRatio || 1;
		} else {
			// No auto-scaling
			this._devicePixelRatio = 1;
		}

		if (this._devicePixelRatio !== 1) {
			this._canvasElement.style.width = this._bounds2d.x + "px";
			this._canvasElement.style.height = this._bounds2d.y + "px";
		}

		//this.log(`Device pixel ratio is ${this._devicePixelRatio}`);
	}

	_resizeEvent = (event?: Event) => {
		if (this._autoSize) {
			let newWidth = window.innerWidth;
			let newHeight = window.innerHeight;

			// Only update canvas dimensions if it exists
			if (this._canvasElement) {
				// Check if we can get the position of the canvas
				const canvasBoundingRect = this._getCanvasElementPosition();

				// Adjust the newWidth and newHeight by the canvas offset
				newWidth -= canvasBoundingRect.left;
				newHeight -= canvasBoundingRect.top;

				// Make sure we can divide the new width and height by 2...
				// otherwise minus 1 so we get an even number so that we
				// negate the blur effect of sub-pixel rendering
				if (newWidth % 2) {
					newWidth--;
				}
				if (newHeight % 2) {
					newHeight--;
				}

				this._canvasElement.width = newWidth * this._devicePixelRatio;
				this._canvasElement.height = newHeight * this._devicePixelRatio;

				this._updateDevicePixelRatio();
			}

			this._bounds2d = new IgePoint2d(newWidth, newHeight);
		} else {
			if (this._canvasElement) {
				this._bounds2d = new IgePoint2d(this._canvasElement.width, this._canvasElement.height);
			}
		}

		this._resized = true;
	};

	renderSceneGraph (arr: IgeObject[], bounds: IgePoint2d) {
		return true;
	}

	/**
	 * Clear the entire canvas.
	 */
	clear () {}
}
