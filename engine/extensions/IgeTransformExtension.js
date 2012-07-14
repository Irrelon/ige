var IgeTransformExtension = {
	translateBy: function (x, y, z) {
		this._translate.x += x;
		this._translate.y += y;
		this._translate.z += z;

		this._updateWorldTranslate();
	
		return this._entity || this;
	},

	translateTo: function (x, y, z) {
		this._translate.x = x;
		this._translate.y = y;
		this._translate.z = z;

		this._updateWorldTranslate();
	
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

		this._updateWorldRotate();
	
		return this._entity || this;
	},

	rotateTo: function (x, y, z) {
		this._rotate.x = x;
		this._rotate.y = y;
		this._rotate.z = z;

		this._updateWorldRotate();
	
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

		this._updateWorldScale();
	
		return this._entity || this;
	},

	scaleTo: function (x, y, z) {
		this._scale.x = x;
		this._scale.y = y;
		this._scale.z = z;

		this._updateWorldScale();
	
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

	_updateWorldTranslate: function () {
		if (this._parent) {
			var localVals = this._translate,
				parentVals = this._parent._worldTranslate || this._parent._translate || {x:0, y: 0, z: 0};

			if (parentVals) {
				this._worldTranslate = new IgePoint(
					parentVals.x + localVals.x,
					parentVals.y + localVals.y,
					parentVals.z + localVals.z
				);
			}
		}

		// Update all child objects
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount]._updateWorldTranslate();
			}
		}
	},

	_updateWorldRotate: function () {
		if (this._parent) {
			var localVals = this._rotate,
				parentVals = this._parent._worldRotate || this._parent._rotate || {x:0, y: 0, z: 0};

			if (parentVals) {
				this._worldRotate = new IgePoint(
					parentVals.x + localVals.x,
					parentVals.y + localVals.y,
					parentVals.z + localVals.z
				);
			}
		}

		// Update all child objects
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount]._updateWorldRotate();
			}
		}
	},

	_updateWorldScale: function () {
		if (this._parent) {
			var localVals = this._scale,
				parentVals = this._parent._worldScale || this._parent._scale || {x:1, y: 1, z: 1};

			if (parentVals) {
				this._worldScale = new IgePoint(
					parentVals.x * localVals.x,
					parentVals.y * localVals.y,
					parentVals.z * localVals.z
				);
			}
		}

		// Update all child objects
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount]._updateWorldScale();
			}
		}
	},

	_updateWorldTransform: function () {
		this._updateWorldTranslate();
		this._updateWorldRotate();
		this._updateWorldScale();
	},

	_rotatePoint: function (point, radians, origin) {
		var cosAngle = Math.cos(radians),
			sinAngle = Math.sin(radians);

		return {
			x: origin.x + (point.x - origin.x) * cosAngle + (point.y - origin.y) * sinAngle,
			y: origin.y - (point.x - origin.x) * sinAngle + (point.y - origin.y) * cosAngle
		};
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTransformExtension; }