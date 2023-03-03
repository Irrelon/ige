var ShipControl = function () {
	if (ige.components.input.actionState('rotateLeft')) {
		// Rotate the ship counter-clockwise
		this.rotateBy(0, 0, Math.radians(-0.1 * ige._tickDelta));
	}

	if (ige.components.input.actionState('rotateRight')) {
		// Rotate the ship clockwise
		this.rotateBy(0, 0, Math.radians(0.1 * ige._tickDelta));
	}
};
