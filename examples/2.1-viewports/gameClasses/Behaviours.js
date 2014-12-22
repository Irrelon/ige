var RotatorBehaviour = function (ctx) {
	this.rotateBy(0, 0, (0.1 * ige._tickDelta) * Math.PI / 180);
};

var RotatorBehaviourAC = function (ctx) {
	this.rotateBy(0, 0, (-0.1 * ige._tickDelta) * Math.PI / 180);
};

var ScalerBehaviour = function (ctx) {
	if (this.data('scalerMode') === undefined) {
		this.data('scalerMode', 1);
	}

	if (this.data('scalerMode') === 1) {
		this.scaleBy((0.001 * ige._tickDelta), (0.001 * ige._tickDelta), (0.001 * ige._tickDelta));

		if (this._scale.x >= 4) {
			this.data('scalerMode', 2);
			this.scaleTo(4, 4, 4);
		}

		return true;
	}

	if (this.data('scalerMode') === 2) {
		this.scaleBy(-(0.001 * ige._tickDelta), -(0.001 * ige._tickDelta), -(0.001 * ige._tickDelta));

		if (this._scale.x <= 1) {
			this.data('scalerMode', 1);
			this.scaleTo(1, 1, 1);
		}

		return true;
	}
};