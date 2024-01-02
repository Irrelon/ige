"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeBox2dDebugPainter = void 0;
const instance_1 = require("../../../instance");
const IgeEntity_1 = require("../../../core/IgeEntity");
const igeClassStore_1 = require("../../../igeClassStore");
class IgeBox2dDebugPainter extends IgeEntity_1.IgeEntity {
	constructor(entity, options) {
		super();
		this.classId = "IgeBox2dDebugPainter";
		this._entity = entity;
		this._options = options;
	}
	tick(ctx) {
		var _a;
		if (this._parent && this._parent.isometricMounts()) {
			ctx.scale(1.414, 0.707); // This should be super-accurate now
			ctx.rotate((45 * Math.PI) / 180);
		}
		(_a = instance_1.ige.box2d._world) === null || _a === void 0 ? void 0 : _a.DrawDebugData();
		super.tick(ctx);
	}
}
exports.IgeBox2dDebugPainter = IgeBox2dDebugPainter;
(0, igeClassStore_1.registerClass)(IgeBox2dDebugPainter);
