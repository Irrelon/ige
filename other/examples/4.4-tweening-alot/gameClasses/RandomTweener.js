import { IgeEntity } from "../../../engine/core/IgeEntity.js";
import { IgeTween } from "../../../engine/core/IgeTween.js";
import { ige } from "../../../engine/instance.js";
import { PI180 } from "../../../engine/utils.js";

export class RandomTweener extends IgeEntity {
	constructor () {
		super();
		this.classId = "RandomTweener";
		this.newTween();
	}
	/**
	 * Creates a new random position and rotation to tween
	 * to and then starts the tween.
	 */
	newTween () {
		new IgeTween(this._translate)
			.duration(7000)
			.properties({
				x: Math.random() * ige.engine._bounds2d.x - ige.engine._bounds2d.x2,
				y: Math.random() * ige.engine._bounds2d.y - ige.engine._bounds2d.y2
			})
			.easing("outElastic")
			.afterTween(() => {
				this.newTween();
			})
			.start();
		this._rotate
			.tween()
			.duration(7000)
			.properties({ z: Math.random() * 360 * PI180 })
			.easing("outElastic")
			.start();
	}
}
