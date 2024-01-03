import type { IgeCanvas } from "@/export/exports";

export const newCanvas = (): IgeCanvas => {
	const instance = new OffscreenCanvas(2, 2);

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

	Object.defineProperty(instance, "src", {
		configurable: true,
		enumerable: true,
		writable: true,
		value: "Canvas"
	});

	return instance as IgeCanvas;
};
