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

	translateByIso: function (x, y, z) {
		this.translateBy(x, y, z);

		var x = this._translate.x,
			y = this._translate.y,
			z = this._translate.z;

		// Set the z so that z = 0 always rests against the floor plane
		z += this.geometry3d.z / 2;
		z = -z; // Invert the z axis so that it points "up" the screen

		var sx = x - y,
			sy = z * 1.2247 + (x + y) * 0.5;

		this._translateIso.x = sx;
		this._translateIso.y = sy;

		return this._entity || this;
	},

	translateToIso: function (x, y, z) {
		this.translateTo(x, y, z);

		var x = this._translate.x,
			y = this._translate.y,
			z = this._translate.z;

		// Set the z so that z = 0 always rests against the floor plane
		z += this.geometry3d.z / 2;
		z = -z; // Invert the z axis so that it points "up" the screen

		var sx = x - y,
			sy = z * 1.2247 + (x + y) * 0.5;

		this._translateIso.x = sx;
		this._translateIso.y = sy;

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
		// TODO: Is this the fastest way of doing this? Take a look at CAAT to see how they do it
		this._localMatrix.identity();
		if (this._mode === 0) {
			// 2d translation
			this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
		}

		if (this._mode === 1) {
			// iso translation
			this._localMatrix.multiply(this._localMatrix._newTranslate(this._translateIso.x, this._translateIso.y));
		}
		this._localMatrix.multiply(this._localMatrix._newRotate(this._rotate.z));
		this._localMatrix.multiply(this._localMatrix._newScale(this._scale.x, this._scale.y));
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTransformExtension; }