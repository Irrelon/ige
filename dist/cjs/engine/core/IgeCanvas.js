"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newCanvas = void 0;
const newCanvas = () => {
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
	return instance;
};
exports.newCanvas = newCanvas;
