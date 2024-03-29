import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeBounds } from "@/engine/core/IgeBounds";
import { IgeTween } from "@/engine/core/IgeTween";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { registerClass } from "@/engine/utils/igeClassStore";
import { IgeBehaviourType } from "@/enums";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

/**
 * Creates a new camera that will be attached to a viewport.
 */
export class IgeCamera extends IgeEntity {
	classId = "IgeCamera";
	_entity: IgeViewport;
	_trackRotateTarget?: IgeEntity;
	_trackTranslateTarget?: IgeEntity;
	_trackRotateSmoothing?: number;
	_trackTranslateSmoothing?: number;
	_trackTranslateRounding?: boolean;
	_limit?: IgeBounds;

	constructor (viewport: IgeViewport) {
		super();

		this._trackRotateTarget = undefined;
		this._trackTranslateTarget = undefined;
		this._trackRotateSmoothing = undefined;
		this._trackTranslateSmoothing = undefined;

		// Store the viewport this camera is attached to
		this._entity = viewport;
	}

	/**
	 * Gets / sets the rectangle that the camera translate
	 * will be limited to using an IgeBounds instance.
	 * @param {IgeBounds=} rect
	 * @return {*}
	 */
	limit (rect?: IgeBounds) {
		// TODO: Write the usage of this limit data, currently does nothing
		if (rect !== undefined) {
			this._limit = rect;
			return this._entity;
		}

		return this._limit;
	}

	/**
	 * Pan (tween) the camera to the new specified point in
	 * the specified time.
	 * @param {IgePoint3d} point The point describing the co-ordinates to pan to.
	 * @param {number} durationMs The number of milliseconds to span the pan operation over.
	 * @param {string=} easing Optional easing method name.
	 */
	panTo (point?: IgePoint3d, durationMs?: number, easing: string = "none") {
		if (point !== undefined) {
			new IgeTween(this._translate)
				.properties({
					x: point.x,
					y: point.y,
					z: point.z
				})
				.duration(durationMs)
				.easing(easing)
				.start();
		}

		return this._entity;
	}

	/**
	 * Pan (tween) the camera by the new specified point in
	 * the specified time.
	 * @param {IgePoint3d} point The point describing the co-ordinates to pan by.
	 * @param {number} durationMs The number of milliseconds to span the pan operation over.
	 * @param {string=} easing Optional easing method name.
	 */
	panBy (point?: IgePoint3d, durationMs?: number, easing: string = "none") {
		if (point !== undefined) {
			this._translate
				.tween()
				.properties({
					x: point.x + this._translate.x,
					y: point.y + this._translate.y,
					z: point.z + this._translate.z
				})
				.duration(durationMs)
				.easing(easing)
				.start();
		}

		return this._entity;
	}

	/**
	 * Tells the camera to track the movement of the specified
	 * target entity. The camera will center on the entity.
	 * @param {IgeEntity} entity
	 * @param {number=} smoothing Determines how quickly the camera
	 * will track the target, the higher the number, the slower the
	 * tracking will be.
	 * @param {boolean=} rounding Sets if the smoothing system is
	 * allowed to use floating point values or not. If enabled then
	 * it will not use floating point values.
	 * @return {*}
	 */
	trackTranslate<EntityType extends IgeEntity = IgeEntity> (
		entity: EntityType,
		smoothing?: number,
		rounding?: boolean
	) {
		if (entity !== undefined) {
			this.log("Camera on viewport " + this._entity.id() + " is now tracking translation target " + entity.id());
			if (rounding !== undefined) {
				this._trackTranslateRounding = rounding;
			}

			if (smoothing !== undefined) {
				this._trackTranslateSmoothing = smoothing >= 1 ? smoothing : 0;
			}

			this._trackTranslateTarget = entity;
			return this._entity;
		}

		return this._trackTranslateTarget;
	}

	/**
	 * Gets / sets the `translate` tracking smoothing value.
	 * @param {number=} val
	 * @return {*}
	 */
	trackTranslateSmoothing (val?: number) {
		if (val !== undefined) {
			this._trackTranslateSmoothing = val;
			return this;
		}

		return this._trackTranslateSmoothing;
	}

	/**
	 * Gets / sets the `translate` tracking smoothing rounding
	 * either enabled or disabled. When enabled the `translate`
	 * smoothing value will be rounded so that floating point
	 * values are not used which can help when smoothing on a
	 * scene that has texture smoothing disabled so sub-pixel
	 * rendering doesn't work and objects appear to "snap"
	 * into position as the smoothing interpolates.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	trackTranslateRounding (val?: boolean) {
		if (val !== undefined) {
			this._trackTranslateRounding = val;
			return this;
		}

		return this._trackTranslateRounding;
	}

	/**
	 * Stops tracking the current tracking target's translation.
	 */
	unTrackTranslate () {
		delete this._trackTranslateTarget;
	}

	/**
	 * Tells the camera to track the rotation of the specified
	 * target entity.
	 * @param {IgeEntity} entity
	 * @param {number=} smoothing Determines how quickly the camera
	 * will track the target, the higher the number, the slower the
	 * tracking will be.
	 * @return {*}
	 */
	trackRotate (entity?: IgeEntity, smoothing?: number) {
		if (entity !== undefined) {
			this.log("Camera on viewport " + this._entity.id() + " is now tracking rotation of target " + entity.id());
			this._trackRotateSmoothing = smoothing !== undefined && smoothing >= 1 ? smoothing : 0;
			this._trackRotateTarget = entity;
			return this._entity;
		}

		return this._trackRotateTarget;
	}

	/**
	 * Gets / sets the `rotate` tracking smoothing value.
	 * @param {number=} val
	 * @return {*}
	 */
	trackRotateSmoothing (val?: number) {
		if (val !== undefined) {
			this._trackRotateSmoothing = val;
			return this;
		}

		return this._trackRotateSmoothing;
	}

	/**
	 * Stops tracking the current tracking target.
	 */
	unTrackRotate () {
		delete this._trackRotateTarget;
	}

	/**
	 * Translates the camera to the center of the specified entity so
	 * that the camera is "looking at" the entity.
	 * @param {IgeEntity} entity The entity to look at.
	 * @param {number=} durationMs If specified, will cause the
	 * camera to tween to the location of the entity rather than
	 * snapping to it instantly.
	 * @param {string=} easing The easing method name to use if
	 * tweening by duration.
	 * @return {*}
	 */
	lookAt (entity?: IgeEntity, durationMs?: number, easing: string = "none") {
		if (entity !== undefined) {
			entity.updateTransform();

			if (!durationMs) {
				// Copy the target's world matrix translate data
				this._translate.x = Math.floor(entity._worldMatrix.matrix[2]);
				this._translate.y = Math.floor(entity._worldMatrix.matrix[5]);
			} else {
				this._translate
					.tween()
					.properties({
						x: Math.floor(entity._worldMatrix.matrix[2]),
						y: Math.floor(entity._worldMatrix.matrix[5]),
						z: 0
					})
					.duration(durationMs)
					.easing(easing)
					.start();
			}

			this.updateTransform();
		}

		return this;
	}

	update () {
		// Process any behaviours assigned to the camera
		this._processBehaviours(IgeBehaviourType.preUpdate);

		// Check if we are tracking the translation value of a target
		if (this._trackTranslateTarget) {
			const targetEntity = this._trackTranslateTarget;
			const targetMatrix = targetEntity._worldMatrix.matrix;
			const targetX = targetMatrix[2];
			const targetY = targetMatrix[5];

			let sourceX, sourceY, distX, distY, destinationX, destinationY;

			if (!this._trackTranslateSmoothing) {
				// Copy the target's world matrix translate data
				this.lookAt(this._trackTranslateTarget);
			} else {
				// Ease between the current and target values
				sourceX = this._translate.x;
				sourceY = this._translate.y;

				distX = Math.round(targetX - sourceX);
				distY = Math.round(targetY - sourceY);

				if (this._trackTranslateRounding) {
					destinationX = this._translate.x + Math.round(distX / this._trackTranslateSmoothing);
					destinationY = this._translate.y + Math.round(distY / this._trackTranslateSmoothing);
				} else {
					destinationX = this._translate.x + distX / this._trackTranslateSmoothing;
					destinationY = this._translate.y + distY / this._trackTranslateSmoothing;
				}

				// Check camera Limits
				if (this._limit) {
					if (destinationX < this._limit.x) {
						destinationX = this._limit.x;
					}
					if (destinationX > this._limit.x + this._limit.width) {
						destinationX = this._limit.x + this._limit.width;
					}
					if (destinationY < this._limit.y) {
						destinationY = this._limit.y;
					}
					if (destinationY > this._limit.y + this._limit.height) {
						destinationY = this._limit.y + this._limit.height;
					}
				}

				this._translate.x = destinationX;
				this._translate.y = destinationY;
			}
		}

		// Check if we are tracking the rotation values of a target
		if (this._trackRotateTarget) {
			const targetParentRZ = this._trackRotateTarget._parent ? this._trackRotateTarget._parent._rotate.z : 0;
			const targetZ = -(targetParentRZ + this._trackRotateTarget._rotate.z);

			let sourceZ, distZ;

			if (!this._trackRotateSmoothing) {
				// Copy the target's rotate data
				this._rotate.z = targetZ;
			} else {
				// Interpolate between the current and target values
				sourceZ = this._rotate.z;
				distZ = targetZ - sourceZ;

				this._rotate.z += distZ / this._trackRotateSmoothing;
			}
		}

		this.updateTransform();
	}

	/**
	 * Process operations during the engine tick.
	 * @param {CanvasRenderingContext2D} ctx
	 */
	tick (ctx: IgeCanvasRenderingContext2d) {
		// Process any behaviours assigned to the camera
		this._processBehaviours(IgeBehaviourType.preTick, ctx);

		// Updated local transform matrix and then transform the context
		this._localMatrix.transformRenderingContext(ctx);
	}

	/**
	 * Checks the current transform values against the previous ones. If
	 * any value is different, the appropriate method is called which will
	 * update the transformation matrix accordingly. This version of the
	 * method is specifically designed for cameras!
	 */
	updateTransform () {
		this._localMatrix.identity();

		// On cameras, we do the rotation and scaling FIRST
		this._localMatrix.multiply(this._localMatrix._newRotate(this._rotate.z));
		this._localMatrix.multiply(this._localMatrix._newScale(this._scale.x, this._scale.y));

		// 2d translation - cameras are never in iso mode!
		this._localMatrix.multiply(this._localMatrix._newTranslate(-this._translate.x, -this._translate.y));

		if (this._parent) {
			this._worldMatrix.copy(this._parent._worldMatrix);
			this._worldMatrix.multiply(this._localMatrix);
		} else {
			this._worldMatrix.copy(this._localMatrix);
		}

		return this;
	}

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @private
	 * @return {string}
	 */
	_stringify () {
		// Get the properties for all the super-classes
		let str = super._stringify();
		let i: keyof this;

		// Loop properties and add property assignment code to string
		for (i in this) {
			if (this.hasOwnProperty(i) && this[i] !== undefined) {
				switch (i) {
				case "_trackTranslateTarget":
					if (this._trackTranslateTarget) {
						str +=
							".trackTranslate(ige.$('" +
							this._trackTranslateTarget.id() +
							"'), " +
							this.trackTranslateSmoothing() +
							")";
					}
					break;
				case "_trackRotateTarget":
					if (this._trackRotateTarget) {
						str +=
							".trackRotate(ige.$('" +
							this._trackRotateTarget.id() +
							"'), " +
							this.trackRotateSmoothing() +
							")";
					}
					break;
				}
			}
		}

		return str;
	}
}

registerClass(IgeCamera);
