import type { IgeAudioController } from "@/engine/audio/IgeAudioController";
import { IgeInputComponent } from "@/engine/components/IgeInputComponent";
import type { IgeBox2dController } from "@/engine/components/physics/box2d/IgeBox2dController";
import { igeConfig } from "@/engine/core/config";
import { IgeArrayRegister } from "@/engine/core/IgeArrayRegister";
import { IgeDependencies } from "@/engine/core/IgeDependencies";
import type { IgeEngine } from "@/engine/core/IgeEngine";
import { IgeMetrics } from "@/engine/core/IgeMetrics";
import { IgeObjectRegister } from "@/engine/core/IgeObjectRegister";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeRouter } from "@/engine/core/IgeRouter";
import { IgeTextureStore } from "@/engine/core/IgeTextureStore";
import { IgeTimeController } from "@/engine/core/IgeTimeController";
import type { IgeTweenController } from "@/engine/core/IgeTweenController";
import type { IgeUiManagerController } from "@/engine/core/IgeUiManagerController";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import type { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import type { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import { isClient, isServer, isWorker } from "@/engine/utils/clientServer";
import { igeClassStore } from "@/engine/utils/igeClassStore";
import type { IgeCanRegisterAndCanDestroy } from "@/types/IgeCanRegisterAndCanDestroy";
import type { IgeCanRegisterByCategory } from "@/types/IgeCanRegisterByCategory";
import type { IgeConfig } from "@/types/IgeConfig";
import type { IgeIsReadyPromise } from "@/types/IgeIsReadyPromise";
import type { IgeObjectWithValueProperty } from "@/types/IgeObjectWithValueProperty";

const version = "3.0.1";

export class Ige implements IgeIsReadyPromise {
	app: any = null;
	// @ts-ignore
	audio: IgeAudioController;
	// @ts-ignore
	router: IgeRouter = new IgeRouter();
	// @ts-ignore
	box2d: IgeBox2dController;
	// @ts-ignore
	network: IgeNetIoClientController | IgeNetIoServerController;
	// @ts-ignore
	tween: IgeTweenController;
	// @ts-ignore
	ui: IgeUiManagerController;
	// @ts-ignore
	engine: IgeEngine;
	textures: IgeTextureStore = new IgeTextureStore();
	input: IgeInputComponent = new IgeInputComponent();
	time: IgeTimeController = new IgeTimeController();
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
	_uses: string[] = [];

	// Questionable properties, think about them and potentially move
	_pointerOverVp?: IgeViewport;
	_pointerPos: IgePoint3d = new IgePoint3d(); // Could probably be just {x: number, y: number}

	constructor () {

	}

	init () {
		// Output our header
		console.log("-----------------------------------------");
		console.log(`Powered by Isogenic Engine`);
		console.log("(C)opyright " + new Date().getFullYear() + " Irrelon Software Limited");
		console.log("https://www.isogenicengine.com");
		console.log("-----------------------------------------");

		this.uses("engine");
		this.uses("input");
		this.uses("time");

		//this.dependencies.markAsSatisfied("engine");
		//this.dependencies.markAsSatisfied("box2d");
	}

	uses (moduleName: string) {
		this._uses.push(moduleName);
		console.log("Using dependency:", moduleName);

		switch (moduleName) {
			case "input":
				this.dependencies.add("input", this.input.isReady());
				break;

			case "time":
				this.dependencies.add("time", this.time.isReady());
				break;

			case "engine":
				this.dependencies.add(
					"engine",
					import("./IgeEngine.js").then(({ IgeEngine: Module }) => {
						this.engine = new Module();
					})
				);
				break;
			case "network":
				if (isClient) {
					this.dependencies.add(
						"network",
						import("../network/client/IgeNetIoClientController.js").then(({ IgeNetIoClientController: Module }) => {
							this.network = new Module();
						})
					);
				}

				if (isServer) {
					this.dependencies.add(
						"network",
						import("../network/server/IgeNetIoServerController.js").then(({ IgeNetIoServerController: Module }) => {
							this.network = new Module();
						})
					);
				}
				break;

			case "audio":
				if (isClient && !isWorker) {
					this.dependencies.add(
						"audio",
						import("../audio/IgeAudioController.js").then(({ IgeAudioController: Module }) => {
							this.audio = new Module();
						})
					);
				} else {
					this.dependencies.markAsSatisfied("audio");
				}
				break;

			case "box2d":
				this.dependencies.add(
					"box2d",
					import("../components/physics/box2d/IgeBox2dController.js").then(({ IgeBox2dController: Module }) => {
						this.box2d = new Module();
					})
				);
				break;

			case "tweening":
				this.dependencies.add(
					"tweening",
					import("./IgeTweenController.js").then(({ IgeTweenController: Module }) => {
						this.tween = new Module();
						this.dependencies.add("tween", this.tween.isReady());
					})
				);
				break;

			case "ui":
				this.dependencies.add(
					"ui",
					import("./IgeUiManagerController.js").then(({ IgeUiManagerController: Module }) => {
						this.ui = new Module();
						this.dependencies.add("ui", this.ui.isReady());
					})
				);
				break;
			default:
				throw new Error(`Unknown optional module "${moduleName}", please remove your call to ige.uses("${moduleName}")`);
		}
	}

	isReady () {
		return new Promise<void>((resolve) => {
			// ["network", "engine", "tween", "time", "ui"]
			console.log("Waiting for dependencies", this._uses);
			this.dependencies.waitFor(this._uses, resolve);
		});
	}

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned. The object is returned
	 * by reference so mutations will affect any other references
	 * to the object. There is no mutation-safe version of this.
	 * @param {string | Object} item The id of the item to return,
	 * or if an object, returns the object as-is.
	 */
	$<ObjectType extends IgeCanRegisterAndCanDestroy | undefined> (
		item: string | IgeCanRegisterAndCanDestroy | undefined
	): ObjectType {
		if (typeof item === "string") {
			return this.register.get(item) as ObjectType;
		}

		return item as ObjectType;
	}

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed category name. By default, the returned array
	 * is by reference, so you only need to get this array once,
	 * and it will receive updates when other objects are added
	 * to a category. Use the `immutable` flag to control this.
	 * @param {String} categoryName The name of the category to return
	 * all objects for.
	 * @param {boolean} [immutable=false] If true, returns a mutation-safe
	 * array where mutations to the array will not affect the underlying
	 * reference.
	 */
	$$<ReturnType extends IgeCanRegisterByCategory | undefined = IgeCanRegisterByCategory> (
		categoryName: string,
		immutable: boolean = false
	): ReturnType[] {
		if (immutable) return (this.categoryRegister.getImmutable(categoryName) || []) as ReturnType[];
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

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * its bounds drawn when the bounds for all objects are being drawn.
	 * In order for bounds to be drawn the viewport the object is being drawn
	 * to must also have draw bounds enabled.
	 * @example #Enable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(true);
	 * @example #Disable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawBounds());
	 */
	drawBounds (val?: boolean, recursive: boolean = true) {
		if (val === undefined) {
			return this._drawBounds;
		}

		this._drawBounds = val;

		// Loop all the way down the scenegraph and enable bounds for all
		this.engine.drawBounds(val, recursive);
		return this;
	}

	data<ValueType = any> (key: string, value: ValueType): this;
	data<ValueType = any> (key: string): ValueType;
	data<ValueType = any> (key: string, value?: ValueType) {
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
