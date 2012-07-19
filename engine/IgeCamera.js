var IgeCamera = IgeClass.extend([
	{extension: IgeTransformExtension, overwrite: false}
], {
	init: function (entity) {
		this._entity = entity;

		this._translate = new IgePoint(0, 0, 0);
		this._rotate = new IgePoint(0, 0, 0);
		this._scale = new IgePoint(1, 1, 1);
		this._origin = new IgePoint(0.5, 0.5, 0.5);

        this._localMatrix = new IgeMatrix2d(this);
        this._worldMatrix = new IgeMatrix2d(this);
	},

	// TODO: Write these methods!
	panTo: function (point) {

	},

	panBy: function (point) {

	},

	updateMatrix: function () {
		this.updateTransform();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeCamera; }