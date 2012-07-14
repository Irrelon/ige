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