var IgeInteractiveEntity = IgeEntity.extend([
	{extension: IgeUiInteractionExtension, overwrite: true}
], {
	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, dontTransform) {
		this._mousePos = this.mousePos();

		if (this._mousePos) {
			var	aabb = this.aabb(),
				mouseX = this._mousePos.x,
				mouseY = this._mousePos.y;

			// Check if the current mouse position is inside this aabb
			if (aabb && (aabb.x <= mouseX && aabb.y <= mouseY && aabb.x + aabb.width > mouseX && aabb.y + aabb.height > mouseY)) {
				// Point is inside the aabb
				if (ige.input.mouseMove) {
					this._handleMouseIn();
				}

				if (ige.input.mouseDown) {
					// The mouse is down
					this._handleMouseDown();
				}

				if (ige.input.mouseUp) {
					// The mouse went up
					this._handleMouseUp();
				}

				/*ctx.fillStyle = '#ffffff';
				ctx.fillText('Entity M (' + this._mousePos.x + ', ' + this._mousePos.y + ')', 0, 0);
				ctx.fillText('Entity P (' + aabb.x + ', ' + aabb.y + ')', 0, 15);*/
			} else {
				if (ige.input.mouseMove) {
					this._handleMouseOut();
				}
			}
		}

		this._super(ctx, dontTransform);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInteractiveEntity; }