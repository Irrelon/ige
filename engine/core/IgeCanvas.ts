import { IgeTexture } from "./IgeTexture";

export interface IgeCanvas extends HTMLCanvasElement {
	_igeTextures: IgeTexture[];
	_loaded: boolean;
}

export const newCanvas = (): IgeCanvas => {
	const instance = document.createElement("canvas");

	Object.defineProperty(instance, "_igeTextures", {
		configurable: true,
		enumerable: true,
		writable: true,
		value: []
	});

	Object.defineProperty(instance, "_loaded", {
		configurable: true,
		enumerable: true,
		writable: true,
		value: false
	});

	return instance as IgeCanvas;
}
