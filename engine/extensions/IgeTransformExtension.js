// TODO: Document this extension
var IgeTransformExtension = {
	translateBy: function (x, y, z) {
		this._translate.x += x;
		this._translate.y += y;
		this._translate.z += z;
	
		return this._entity || this;
	},

	translateTo: function (x, y, z) {
		this._translate.x = x;
		this._translate.y = y;
		this._translate.z = z;
	
		return this._entity || this;
	},

	translate: function () {
		this.tween = this._translateAccessorTween;
		this.x = this._translateAccessorX;
		this.y = this._translateAccessorY;
		this.z = this._translateAccessorZ;

		return this._entity || this;
	},

	_translateAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._translate, propertyObj, durationMs, options);
	},

	_translateAccessorX: function (val) {
		if (val !== undefined) {
			this._translate.x = val;
			return this._entity || this;
		}

		return this._translate.x;
	},

	_translateAccessorY: function (val) {
		if (val !== undefined) {
			this._translate.y = val;
			return this._entity || this;
		}

		return this._translate.y;
	},

	_translateAccessorZ: function (val) {
		// TODO: Do we need to do anything to the matrix here for iso views?
		//this._localMatrix.translateTo(this._translate.x, this._translate.y);
		if (val !== undefined) {
			this._translate.z = val;
			return this._entity || this;
		}

		return this._translate.z;
	},

	rotateBy: function (x, y, z) {
		this._rotate.x += x;
		this._rotate.y += y;
		this._rotate.z += z;
	
		return this._entity || this;
	},

	rotateTo: function (x, y, z) {
		this._rotate.x = x;
		this._rotate.y = y;
		this._rotate.z = z;
	
		return this._entity || this;
	},

	rotate: function () {
		this.tween = this._rotateAccessorTween;
		this.x = this._rotateAccessorX;
		this.y = this._rotateAccessorY;
		this.z = this._rotateAccessorZ;

		return this._entity || this;
	},
	_rotateAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._rotate, propertyObj, durationMs, options);
	},

	_rotateAccessorX: function (val) {
		if (val !== undefined) {
			this._rotate.x = val;
			return this._entity || this;
		}

		return this._rotate.x;
	},

	_rotateAccessorY: function (val) {
		if (val !== undefined) {
			this._rotate.y = val;
			return this._entity || this;
		}

		return this._rotate.y;
	},

	_rotateAccessorZ: function (val) {
		if (val !== undefined) {
			this._rotate.z = val;
			return this._entity || this;
		}

		return this._rotate.z;
	},

	scaleBy: function (x, y, z) {
		this._scale.x += x;
		this._scale.y += y;
		this._scale.z += z;
	
		return this._entity || this;
	},

	scaleTo: function (x, y, z) {
		this._scale.x = x;
		this._scale.y = y;
		this._scale.z = z;
	
		return this._entity || this;
	},

	scale: function () {
		this.tween = this._scaleAccessorTween;
		this.x = this._scaleAccessorX;
		this.y = this._scaleAccessorY;
		this.z = this._scaleAccessorZ;

		return this._entity || this;
	},

	_scaleAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._scale, propertyObj, durationMs, options);
	},

	_scaleAccessorX: function (val) {
		if (val !== undefined) {
			this._scale.x = val;
			return this._entity || this;
		}

		return this._scale.x;
	},

	_scaleAccessorY: function (val) {
		if (val !== undefined) {
			this._scale.y = val;
			return this._entity || this;
		}

		return this._scale.y;
	},

	_scaleAccessorZ: function (val) {
		if (val !== undefined) {
			this._scale.z = val;
			return this._entity || this;
		}

		return this._scale.z;
	},

	originBy: function (x, y, z) {
		this._origin.x += x;
		this._origin.y += y;
		this._origin.z += z;

		return this._entity || this;
	},

	originTo: function (x, y, z) {
		this._origin.x = x;
		this._origin.y = y;
		this._origin.z = z;

		return this._entity || this;
	},

	origin: function () {
		this.tween = this._originAccessorTween;
		this.x = this._originAccessorX;
		this.y = this._originAccessorY;
		this.z = this._originAccessorZ;

		return this._entity || this;
	},

	_originAccessorTween: function (propertyObj, durationMs, options) {
		return new IgeTween(this._origin, propertyObj, durationMs, options);
	},

	_originAccessorX: function (val) {
		if (val !== undefined) {
			this._origin.x = val;
			return this._entity || this;
		}

		return this._origin.x;
	},

	_originAccessorY: function (val) {
		if (val !== undefined) {
			this._origin.y = val;
			return this._entity || this;
		}

		return this._origin.y;
	},

	_originAccessorZ: function (val) {
		if (val !== undefined) {
			this._origin.z = val;
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
		// TODO: Is this the fastest way of doing this? Take a look at CAAT to see how they do it. (Thanks Ibon)
		this._localMatrix.identity();
		if (this._mode === 0) {
			// 2d translation
			this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
		}

		if (this._mode === 1) {
			// iso translation
			var isoPoint = this._translateIso = new IgePoint(
				this._translate.x,
				this._translate.y,
				this._translate.z + this.geometry3d.z / 2
			).toIso();

			if (this._parent && this._parent.geometry3d.z) {
				// This adjusts the child entity so that 0, 0, 0 inside the
				// parent is the center of the base of the parent
				isoPoint.y += this._parent.geometry3d.z / 1.6;
			}

			this._localMatrix.multiply(this._localMatrix._newTranslate(isoPoint.x, isoPoint.y));
		}
		this._localMatrix.multiply(this._localMatrix._newRotate(this._rotate.z));
		this._localMatrix.multiply(this._localMatrix._newScale(this._scale.x, this._scale.y));
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTransformExtension; }