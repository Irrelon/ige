"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiInlineFlow = void 0;
const IgeUiElement_1 = require("../core/IgeUiElement.js");
const igeClassStore_1 = require("../igeClassStore.js");
class IgeUiInlineFlow extends IgeUiElement_1.IgeUiElement {
	constructor() {
		super(...arguments);
		this.classId = "IgeUiInlineFlow";
	}
	tick(ctx, dontTransform = false) {
		// Loop children and re-position them
		const arr = this._children;
		const arrCount = arr.length;
		let currentX = 0;
		for (let i = 0; i < arrCount; i++) {
			const item = arr[i];
			const itemX = item._bounds2d.x;
			item.left(currentX);
			currentX += itemX;
		}
		// call the super-class tick
		super.tick(ctx, dontTransform);
	}
}
exports.IgeUiInlineFlow = IgeUiInlineFlow;
(0, igeClassStore_1.registerClass)(IgeUiInlineFlow);
