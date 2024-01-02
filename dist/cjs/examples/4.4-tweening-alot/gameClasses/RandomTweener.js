"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomTweener = void 0;
const instance_1 = require("../../../engine/instance.js");
const utils_1 = require("../../../engine/utils.js");
const IgeTween_1 = require("../../../engine/core/IgeTween.js");
const IgeEntity_1 = require("../../../engine/core/IgeEntity.js");
class RandomTweener extends IgeEntity_1.IgeEntity {
	constructor() {
		super();
		this.classId = "RandomTweener";
		this.newTween();
	}
	/**
	 * Creates a new random position and rotation to tween
	 * to and then starts the tween.
	 */
	newTween() {
		new IgeTween_1.IgeTween(this._translate)
			.duration(7000)
			.properties({
				x: Math.random() * instance_1.ige.engine._bounds2d.x - instance_1.ige.engine._bounds2d.x2,
				y: Math.random() * instance_1.ige.engine._bounds2d.y - instance_1.ige.engine._bounds2d.y2
			})
			.easing("outElastic")
			.afterTween(() => {
				this.newTween();
			})
			.start();
		this._rotate
			.tween()
			.duration(7000)
			.properties({ z: Math.random() * 360 * utils_1.PI180 })
			.easing("outElastic")
			.start();
	}
}
exports.RandomTweener = RandomTweener;
