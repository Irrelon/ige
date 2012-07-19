var IgeInteractiveEntity = IgeEntity.extend([
	{extension: IgeUiInteractionExtension, overwrite: true}
], {
	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, dontTransform) {
		var	aabb = this.aabb(),
			mouseX = ige._mousePos.x,
			mouseY = ige._mousePos.y;

		// Calculate the current mouse position inside the viewport
		/*this._mousePos = new IgePoint(0, 0, 0);
		this._mouseWorldMatrix = new IgeMatrix2d();
		this._mouseWorldMatrix.copy(this._parent._worldMatrix);
		this._mouseWorldMatrix.multiply(this._localMatrix._newTranslate(ige._mousePos.x + this.camera._translate.x, ige._mousePos.y + this.camera._translate.y));
		this._mouseWorldMatrix.transformCoord(this._mousePos);*/

		// Check if the current mouse position is inside this aabb
		if (aabb && (aabb.x <= mouseX && aabb.y <= mouseY && aabb.x + aabb.width > mouseX && aabb.y + aabb.height > mouseY)) {
			// Point is inside the aabb
			this._handleMouseIn();
		} else {
			this._handleMouseOut();
		}

		this._super(ctx, dontTransform);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInteractiveEntity; }