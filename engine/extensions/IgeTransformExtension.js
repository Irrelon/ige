var IgeTransformExtension = {
	translateBy: function (x, y, z) {
		this._translate.x += x;
		this._translate.y += y;
		this._translate.z += z;

		this._updateTranslate();
		this._localMatrix.translateTo(x, y);
	
		return this._entity || this;
	},

	translateTo: function (x, y, z) {
		this._translate.x = x;
		this._translate.y = y;
		this._translate.z = z;

		this._updateTranslate();
		this._localMatrix.translateTo(x, y);
	
		return this._entity || this;
	},

	translate: function () {
		this.tween = this._translateAccessorTween;
		this.x = this._translateAccessorX;
		this.y = this._translateAccessorY;
		this.z = this._translateAccessorZ;

		return this._entity || this;
	},

	_updateTranslate: function () {
		this._translateOld.x = this._translate.x;
		this._translateOld.y = this._translate.y;
		this._translateOld.z = this._translate.z;
	},

	_translateAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._translate, propertyObj, durationMs, options);
	},

	_translateAccessorX: function (val) {
		if (val !== undefined) {
			this._translate.x = val;
			this._updateTranslate();
			this._localMatrix.translateTo(this._translate.x, this._translate.y);
			return this._entity || this;
		}

		return this._translate.x;
	},

	_translateAccessorY: function (val) {
		if (val !== undefined) {
			this._translate.y = val;
			this._updateTranslate();
			this._localMatrix.translateTo(this._translate.x, this._translate.y);
			return this._entity || this;
		}

		return this._translate.y;
	},

	_translateAccessorZ: function (val) {
		// TODO: Do we need to do anything to the matrix here for iso views?
		//this._localMatrix.translateTo(this._translate.x, this._translate.y);
		if (val !== undefined) {
			this._translate.z = val;
			this._updateTranslate();
			return this._entity || this;
		}

		return this._translate.z;
	},

	rotateBy: function (x, y, z) {
		this._rotate.x += x;
		this._rotate.y += y;
		this._rotate.z += z;

		this._updateRotate();
		this._localMatrix.rotateTo(this._rotate.z);
	
		return this._entity || this;
	},

	rotateTo: function (x, y, z) {
		this._rotate.x = x;
		this._rotate.y = y;
		this._rotate.z = z;

		this._updateRotate();
		this._localMatrix.rotateTo(this._rotate.z);
	
		return this._entity || this;
	},

	rotate: function () {
		this.tween = this._rotateAccessorTween;
		this.x = this._rotateAccessorX;
		this.y = this._rotateAccessorY;
		this.z = this._rotateAccessorZ;

		return this._entity || this;
	},

	_updateRotate: function () {
		this._rotateOld.x = this._rotate.x;
		this._rotateOld.y = this._rotate.y;
		this._rotateOld.z = this._rotate.z;
	},

	_rotateAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._rotate, propertyObj, durationMs, options);
	},

	_rotateAccessorX: function (val) {
		if (val !== undefined) {
			this._rotate.x = val;
			this._updateRotate();
			return this._entity || this;
		}

		return this._rotate.x;
	},

	_rotateAccessorY: function (val) {
		if (val !== undefined) {
			this._rotate.y = val;
			this._updateRotate();
			return this._entity || this;
		}

		return this._rotate.y;
	},

	_rotateAccessorZ: function (val) {
		if (val !== undefined) {
			this._rotate.z = val;
			this._updateRotate();
			this._localMatrix.rotateTo(this._rotate.z);
			return this._entity || this;
		}

		return this._rotate.z;
	},

	scaleBy: function (x, y, z) {
		this._scale.x += x;
		this._scale.y += y;
		this._scale.z += z;

		this._updateScale();
		this._localMatrix.scaleBy(this._scale.x, this._scale.y);
	
		return this._entity || this;
	},

	scaleTo: function (x, y, z) {
		this._scale.x = x;
		this._scale.y = y;
		this._scale.z = z;

		this._updateScale();
		this._localMatrix.scaleTo(this._scale.x, this._scale.y);
	
		return this._entity || this;
	},

	scale: function () {
		this.tween = this._scaleAccessorTween;
		this.x = this._scaleAccessorX;
		this.y = this._scaleAccessorY;
		this.z = this._scaleAccessorZ;

		return this._entity || this;
	},

	_updateScale: function () {
		this._scaleOld.x = this._scale.x;
		this._scaleOld.y = this._scale.y;
		this._scaleOld.z = this._scale.z;
	},

	_scaleAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._scale, propertyObj, durationMs, options);
	},

	_scaleAccessorX: function (val) {
		if (val !== undefined) {
			this._scale.x = val;
			this._updateScale();
			this._localMatrix.scaleTo(this._scale.x, this._scale.y);
			return this._entity || this;
		}

		return this._scale.x;
	},

	_scaleAccessorY: function (val) {
		if (val !== undefined) {
			this._scale.y = val;
			this._updateScale();
			this._localMatrix.scaleTo(this._scale.x, this._scale.y);
			return this._entity || this;
		}

		return this._scale.y;
	},

	_scaleAccessorZ: function (val) {
		if (val !== undefined) {
			this._scale.z = val;
			this._updateScale();
			return this._entity || this;
		}

		return this._scale.z;
	},

	originBy: function (x, y, z) {
		this._origin.x += x;
		this._origin.y += y;
		this._origin.z += z;

		this._updateOrigin();
	
		return this._entity || this;
	},

	originTo: function (x, y, z) {
		this._origin.x = x;
		this._origin.y = y;
		this._origin.z = z;

		this._updateOrigin();
	
		return this._entity || this;
	},

	origin: function () {
		this.tween = this._originAccessorTween;
		this.x = this._originAccessorX;
		this.y = this._originAccessorY;
		this.z = this._originAccessorZ;

		return this._entity || this;
	},

	_updateOrigin: function () {
		this._originOld.x = this._origin.x;
		this._originOld.y = this._origin.y;
		this._originOld.z = this._origin.z;
	},

	_originAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._origin, propertyObj, durationMs, options);
	},

	_originAccessorX: function (val) {
		if (val !== undefined) {
			this._origin.x = val;
			this._updateOrigin();
			return this._entity || this;
		}

		return this._origin.x;
	},

	_originAccessorY: function (val) {
		if (val !== undefined) {
			this._origin.y = val;
			this._updateOrigin();
			return this._entity || this;
		}

		return this._origin.y;
	},

	_originAccessorZ: function (val) {
		if (val !== undefined) {
			this._origin.z = val;
			this._updateOrigin();
			return this._entity || this;
		}

		return this._origin.z;
	},

	_rotatePoint: function (point, radians, origin) {
		var cosAngle = Math.cos(radians),
			sinAngle = Math.sin(radians);

		return {
			x: origin.x + (point.x - origin.x) * cosAngle + (point.y - origin.y) * sinAngle,
			y: origin.y - (point.x - origin.x) * sinAngle + (point.y - origin.y) * cosAngle
		};
	},

	/**
	 * Checks the current transform values against the previous ones. If
	 * any value is different, the appropriate method is called which will
	 * update the transformation matrix accordingly.
	 */
	updateTransform: function () {
		//if (!this._translate.compare(this._translateOld)) {
			this._updateTranslate();
			this._localMatrix.identity();
			this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
		//}

		//if (!this._rotate.compare(this._rotateOld)) {
			this._updateRotate();
			this._localMatrix.multiply(this._localMatrix._newRotate(this._rotate.z));
		//}

		//if (!this._scale.compare(this._scaleOld)) {
			this._updateScale();
			this._localMatrix.multiply(this._localMatrix._newScale(this._scale.x, this._scale.y));
		//}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTransformExtension; }