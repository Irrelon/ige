import { IgeEngine } from "./IgeEngine";
import { IgeConfig, igeConfig } from "./config";
import { IgeTextures } from "./IgeTextures";
import { IgeMetrics } from "./IgeMetrics";
import IgeInputComponent from "../components/IgeInputComponent";
import  { IgeObjectRegister } from "./IgeObjectRegister";
import  { IgeArrayRegister } from "./IgeArrayRegister";

import type { IgeRegisterableByCategory } from "../../types/IgeRegisterableByCategory";
import type IgeEntity from "./IgeEntity";
import type IgeViewport from "./IgeViewport";
import IgePoint3d from "./IgePoint3d";

const version = "2.0.0";

export class Ige {
	engine: IgeEngine = new IgeEngine();
	textures: IgeTextures = new IgeTextures();
	metrics: IgeMetrics = new IgeMetrics();
	input: IgeInputComponent = new IgeInputComponent();
	register: IgeObjectRegister = new IgeObjectRegister();
	categoryRegister: IgeArrayRegister<IgeRegisterableByCategory> = new IgeArrayRegister("_category", "_categoryRegistered");
	groupRegister: IgeArrayRegister<IgeRegisterableByCategory> = new IgeArrayRegister("_category", "_categoryRegistered");
	client: any;
	server: any;
	isServer: boolean;
	isClient: boolean;
	config: IgeConfig = igeConfig;
	version: string = version;

	// Questionable properties, think about them and potentially move
	_mouseOverVp?: IgeViewport;
	_mousePos: IgePoint3d = new IgePoint3d(); // Could probably be just {x: number, y: number}

	constructor () {
		this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined' && typeof window === 'undefined');
		this.isClient = !this.isServer;
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
	$ (item: string | IgeEntity) {
		if (typeof item === "string") {
			return this.register.get(item);
		} else if (typeof item === "object") {
			return item;
		}

		return this;
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

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed group name.
	 * @param {String} groupName The name of the group to return
	 * all objects for.
	 */
	$$$ (groupName: string) {
		return this.groupRegister[groupName] || [];
	}
}