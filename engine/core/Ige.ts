import { IgeEngine } from "./IgeEngine";
import { IgeConfig, igeConfig } from "./config";
import { IgeTextures } from "./IgeTextures";
import { IgeMetrics } from "./IgeMetrics";

const version = "2.0.0";

export class Ige {
	// @ts-ignore
	engine: IgeEngine;
	// @ts-ignore
	textures: IgeTextures;
	metrics: IgeMetrics = new IgeMetrics();
	isServer: boolean;
	isClient: boolean;
	config: IgeConfig = igeConfig;
	version: string = version;

	constructor () {
		this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined' && typeof window === 'undefined');
		this.isClient = !this.isServer;
	}

	init () {
		this.textures = new IgeTextures();
		this.engine = new IgeEngine();
	}
}