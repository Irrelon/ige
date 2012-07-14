var IgeTransformExtension = {
	translateBy: function (x, y, z) {
		this._translate.x += x;
		this._translate.y += y;
		this._translate.z += z;

		this._updateWorldTranslate();
	
		return this;
	},

	translateTo: function (x, y, z) {
		this._translate.x = x;
		this._translate.y = y;
		this._translate.z = z;

		this._updateWorldTranslate();
	
		return this;
	},

	rotateBy: function (x, y, z) {
		this._rotate.x += x;
		this._rotate.y += y;
		this._rotate.z += z;

		this._updateWorldRotate();
	
		return this;
	},

	rotateTo: function (x, y, z) {
		this._rotate.x = x;
		this._rotate.y = y;
		this._rotate.z = z;

		this._updateWorldRotate();
	
		return this;
	},

	scaleBy: function (x, y, z) {
		this._scale.x += x;
		this._scale.y += y;
		this._scale.z += z;

		this._updateWorldScale();
	
		return this;
	},

	scaleTo: function (x, y, z) {
		this._scale.x = x;
		this._scale.y = y;
		this._scale.z = z;

		this._updateWorldScale();
	
		return this;
	},

	originBy: function (x, y, z) {
		this._origin.x += x;
		this._origin.y += y;
		this._origin.z += z;
	
		return this;
	},

	originTo: function (x, y, z) {
		this._origin.x = x;
		this._origin.y = y;
		this._origin.z = z;
	
		return this;
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