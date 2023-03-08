import { igeClassStore } from "../services/igeClassStore";
import { IgeConfig, igeConfig } from "./config";
import { IgeEngine } from "./IgeEngine";
import { IgeTextures } from "./IgeTextures";
import { IgeMetrics } from "./IgeMetrics";
import IgeInputComponent from "../components/IgeInputComponent";
import  { IgeObjectRegister } from "./IgeObjectRegister";

import  { IgeArrayRegister } from "./IgeArrayRegister";
import type { IgeCanRegisterByCategory } from "../../types/IgeCanRegisterByCategory";
import type IgeViewport from "./IgeViewport";
import IgePoint3d from "./IgePoint3d";
import { IgeAudioController } from "../components/audio/IgeAudioController";
import type { IgeNetIoClientComponent } from "../components/network/net.io/IgeNetIoClientComponent";
import type { IgeNetIoServerComponent } from "../components/network/net.io/IgeNetIoServerComponent";
import { isClient, isServer } from "../services/clientServer";
import { IgeObjectWithValueProperty } from "../../types/IgeObjectWithValueProperty";

const version = "2.0.0";

export class Ige {
	engine: IgeEngine = new IgeEngine();
	textures: IgeTextures = new IgeTextures();
	metrics: IgeMetrics = new IgeMetrics();
	input: IgeInputComponent = new IgeInputComponent();
	audio: IgeAudioController = new IgeAudioController();
	network?: IgeNetIoClientComponent | IgeNetIoServerComponent;
	register: IgeObjectRegister = new IgeObjectRegister();
	categoryRegister: IgeArrayRegister<IgeCanRegisterByCategory> = new IgeArrayRegister("_category", "_categoryRegistered");
	groupRegister: IgeArrayRegister<IgeCanRegisterByCategory> = new IgeArrayRegister("_category", "_categoryRegistered");
	client: any;
	server: any;
	config: IgeConfig = igeConfig;
	version: string = version;
	classStore = igeClassStore;
	_watch: (string | IgeObjectWithValueProperty)[] = [];

	// Questionable properties, think about them and potentially move
	_mouseOverVp?: IgeViewport;
	_mousePos: IgePoint3d = new IgePoint3d(); // Could probably be just {x: number, y: number}

	constructor () {
		if (isClient) {
			import("../components/network/net.io/IgeNetIoClientComponent.js").then(({ IgeNetIoClientComponent: Module }) => {
				this.network = new Module();
			});
		}

		if (isServer) {
			import("../components/network/net.io/IgeNetIoServerComponent.js").then(({ IgeNetIoServerComponent: Module }) => {
				this.network = new Module();
			});
		}
	}

	init () {
		this.engine.createRoot();
		//this.textures = new IgeTextures();
		//this.engine = new IgeEngine();
	}

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned.
	 * @param {String || Object} item The id of the item to return,
	 * or if an object, returns the object as-is.
	 */
	$ <ObjectType> (item: string | ObjectType | undefined) {
		if (typeof item === "string") {
			return this.register.get(item);
		} else if (typeof item === "object") {
			return item;
		}

		return undefined;
	}

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed category name.
	 * @param {String} categoryName The name of the category to return
	 * all objects for.
	 */
	$$ (categoryName: string) {
		return this.categoryRegister.get(categoryName) || [];
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
}
