import type { IgeAudioController } from "@/export/exports";
import type { IgeNetIoClientController } from "@/export/exports";
import type { IgeNetIoServerController } from "@/export/exports";
import type { IgeViewport } from "@/export/exports";
import {
	IgeArrayRegister,
	igeConfig,
	IgeDependencies,
	IgeEngine,
	IgeMetrics,
	IgeObjectRegister,
	IgePoint3d,
	IgeRouter,
	IgeTextureStore,
	IgeTimeController,
	IgeTweenController,
	IgeUiManagerController
} from "@/export/exports";
import { igeClassStore, isClient, isServer, isWorker } from "@/export/exports";
import { IgeInputComponent } from "@/export/exports";
import { IgeBox2dController } from "@/export/exports";
import type {
	IgeCanRegisterAndCanDestroy,
	IgeCanRegisterByCategory,
	IgeConfig,
	IgeIsReadyPromise,
	IgeObjectWithValueProperty
} from "@/export/exports";

const version = "3.0.1";

export class Ige implements IgeIsReadyPromise {
	app: any = null;
	audio?: IgeAudioController;
	router: IgeRouter = new IgeRouter();
	engine: IgeEngine = new IgeEngine();
	box2d: IgeBox2dController = new IgeBox2dController();
	textures: IgeTextureStore = new IgeTextureStore();
	input: IgeInputComponent = new IgeInputComponent();
	tween: IgeTweenController = new IgeTweenController();
	time: IgeTimeController = new IgeTimeController();
	ui: IgeUiManagerController = new IgeUiManagerController();
	network?: IgeNetIoClientController | IgeNetIoServerController;
	register: IgeObjectRegister = new IgeObjectRegister();
	categoryRegister: IgeArrayRegister<IgeCanRegisterByCategory> = new IgeArrayRegister(
		"_category",
		"_categoryRegistered"
	);
	groupRegister: IgeArrayRegister<IgeCanRegisterByCategory> = new IgeArrayRegister("_group", "_groupRegistered");
	dependencies: IgeDependencies = new IgeDependencies();
	metrics: IgeMetrics = new IgeMetrics();
	client: any;
	server: any;
	config: IgeConfig = igeConfig;
	version: string = version;
	classStore = igeClassStore;
	_data: Record<string, any> = {};
	_watch: (string | IgeObjectWithValueProperty)[] = [];
	_drawBounds: boolean = false;

	// Questionable properties, think about them and potentially move
	_pointerOverVp?: IgeViewport;
	_pointerPos: IgePoint3d = new IgePoint3d(); // Could probably be just {x: number, y: number}

	constructor() {
		if (isClient) {
			this.dependencies.add(
				"network",
				import("../network/client/IgeNetIoClientController.js").then(({ IgeNetIoClientController: Module }) => {
					this.network = new Module();
				})
			);

			if (!isWorker) {
				this.dependencies.add(
					"audio",
					import("../audio/IgeAudioController.js").then(({ IgeAudioController: Module }) => {
						this.audio = new Module();
					})
				);
			}
		}

		if (isServer) {
			this.dependencies.add(
				"network",
				import("../network/server/IgeNetIoServerController.js").then(({ IgeNetIoServerController: Module }) => {
					this.network = new Module();
				})
			);
		}

		this.dependencies.add("tween", this.tween.isReady());
		this.dependencies.add("input", this.input.isReady());
		this.dependencies.add("time", this.time.isReady());
		this.dependencies.add("ui", this.ui.isReady());

		this.dependencies.markAsSatisfied("engine");
		this.dependencies.markAsSatisfied("box2d");
	}

	isReady() {
		return new Promise<void>((resolve) => {
			this.dependencies.waitFor(["network", "engine", "tween", "time", "ui"], resolve);
		});
	}

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned.
	 * @param {string | Object} item The id of the item to return,
	 * or if an object, returns the object as-is.
	 */
	$<ObjectType extends IgeCanRegisterAndCanDestroy | undefined>(
		item: string | IgeCanRegisterAndCanDestroy | undefined
	): ObjectType {
		if (typeof item === "string") {
			return this.register.get(item) as ObjectType;
		}

		return item as ObjectType;
	}

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed category name.
	 * @param {String} categoryName The name of the category to return
	 * all objects for.
	 */
	$$<ReturnType extends IgeCanRegisterByCategory | undefined = IgeCanRegisterByCategory>(
		categoryName: string
	): ReturnType[] {
		return (this.categoryRegister.get(categoryName) || []) as ReturnType[];
	}

	// /**
	//  * Returns an array of all objects that have been assigned
	//  * the passed group name.
	//  * @param {String} groupName The name of the group to return
	//  * all objects for.
	//  */
	// $$$ (groupName: string) {
	// 	return this.groupRegister[groupName] || [];
	// }

	/**
	 * Adds a new watch expression to the watch list which will be
	 * displayed in the stats overlay during a call to _statsTick().
	 * @param {*} evalStringOrObject The expression to evaluate and
	 * display the result of in the stats overlay, or an object that
	 * contains a "value" property.
	 * @returns {number} The index of the new watch expression you
	 * just added to the watch array.
	 */
	watchStart = (evalStringOrObject: string | IgeObjectWithValueProperty): number => {
		this._watch = this._watch || [];
		this._watch.push(evalStringOrObject);

		return this._watch.length - 1;
	};

	/**
	 * Removes a watch expression by its array index.
	 * @param {number} index The index of the watch expression to
	 * remove from the watch array.
	 */
	watchStop = (index: number) => {
		this._watch = this._watch || [];
		this._watch.splice(index, 1);
	};

	drawBounds(val?: boolean, recursive: boolean = false) {
		if (val === undefined) {
			return this._drawBounds;
		}

		this._drawBounds = val;

		// Loop all the way down the scenegraph and enable bounds for all
		this.engine.drawBounds(val, recursive);
		return this;
	}

	data(key: string, value: any): this;
	data(key: string): any;
	data(key: string, value?: any) {
		if (value !== undefined) {
			this._data = this._data || {};
			this._data[key] = value;

			return this;
		}

		if (this._data) {
			return this._data[key];
		}

		return null;
	}
}
