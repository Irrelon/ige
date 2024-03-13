import { type IgeEngine, type IgeViewport } from "@/export/exports";
import { ige } from "@/export/exports";
import { isServer } from "@/engine/clientServer";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { IgePoint2d } from "@/engine/core/IgePoint2d";

export class IgeBaseRenderer extends IgeEventingClass {
	_hasRunSetup: boolean = false;
	_isReady: boolean = false;
	_bounds2d: IgePoint2d = new IgePoint2d(800, 600);

	constructor () {
		super();
	}

	async setup () {
		// Don't run setup on server, we don't render on the server,
		// so we don't need a canvas or rendering backend!
		if (isServer) return;

		// Check if we've already run setup before
		if (this._hasRunSetup) return;
		await this._setup();

		ige.engine.headless(false);
		this._isReady = true;

		this.log("Setup executed");
	}

	/**
	 * Implement this setup function in the renderer that extends
	 * this base class. Called once by the engine via the setup() function
	 * when the renderer is first added. Will not run server-side.
	 */
	async _setup () {
	}

	isReady (): boolean;
	isReady (val: boolean): this;
	isReady (val?: boolean) {
		if (val === undefined) {
			return this._isReady;
		}

		this._isReady = val;
		return this;
	}

	destroy () {
	}

	_resizeEvent = (event?: Event) => {
	};

	renderSceneGraph (engine: IgeEngine, viewports: IgeViewport[]): boolean {
		return this._renderSceneGraph(engine, viewports);
	}

	_renderSceneGraph (engine: IgeEngine, viewports: IgeViewport[]): boolean {
		return false;
	}
}
