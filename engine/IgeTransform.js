// TODO: Should this be a component instead? Check where it's used and determine best for performance and usability
var IgeTransform = function (gameObject) {
	this._entity = gameObject;

	this._translate = new IgePoint(0, 0, 0);
	this._rotate = new IgePoint(0, 0, 0);
	this._scale = new IgePoint(1, 1, 1);
	this._origin = new IgePoint(0.5, 0.5, 0.5);
};

IgeTransform.prototype.translateBy = function (x, y, z) {
	this._translate.x += x;
	this._translate.y += y;
	this._translate.z += z;

	return this._entity;
};

IgeTransform.prototype.translateTo = function (x, y, z) {
	this._translate.x = x;
	this._translate.y = y;
	this._translate.z = z;

	return this._entity;
};

IgeTransform.prototype.rotateBy = function (x, y, z) {
	this._rotate.x += x;
	this._rotate.y += y;
	this._rotate.z += z;

	return this._entity;
};

IgeTransform.prototype.rotateTo = function (x, y, z) {
	this._rotate.x = x;
	this._rotate.y = y;
	this._rotate.z = z;

	return this._entity;
};

IgeTransform.prototype.scaleBy = function (x, y, z) {
	this._scale.x += x;
	this._scale.y += y;
	this._scale.z += z;

	return this._entity;
};

IgeTransform.prototype.scaleTo = function (x, y, z) {
	this._scale.x = x;
	this._scale.y = y;
	this._scale.z = z;

	return this._entity;
};

IgeTransform.prototype.originBy = function (x, y, z) {
	this._origin.x += x;
	this._origin.y += y;
	this._origin.z += z;

	return this._entity;
};

IgeTransform.prototype.originTo = function (x, y, z) {
	this._origin.x = x;
	this._origin.y = y;
	this._origin.z = z;

	return this._entity;
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTransform; }