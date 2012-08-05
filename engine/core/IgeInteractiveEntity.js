var IgeInteractiveEntity = IgeEntity.extend([
	{extension: IgeUiInteractionExtension, overwrite: true}
], {
	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, dontTransform) {
		//this._mousePos = this.mousePos();
		var mp = ige._mousePos,
			aabb, mouseX, mouseY;

		if (mp) {
			aabb = this.aabb();
			mouseX = mp.x;
			mouseY = mp.y;

			// Check if the current mouse position is inside this aabb
			if (aabb && (aabb.x <= mouseX && aabb.y <= mouseY && aabb.x + aabb.width > mouseX && aabb.y + aabb.height > mouseY)) {
				// Point is inside the aabb
				if (ige.input.mouseMove) {
					// There is a mouse move event
					this._handleMouseIn(ige.input.mouseMove);
				}

				if (ige.input.mouseDown) {
					// There is a mouse down event
					this._handleMouseDown(ige.input.mouseDown);
				}

				if (ige.input.mouseUp) {
					// There is a mouse up event
					this._handleMouseUp(ige.input.mouseUp);
				}
			} else {
				if (ige.input.mouseMove) {
					// There is a mouse move event
					this._handleMouseOut(ige.input.mouseMove);
				}
			}
		}

		this._super(ctx, dontTransform);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInteractiveEntity; }