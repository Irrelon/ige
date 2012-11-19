var PlayerBehaviour = function () {
	if (ige.input.actionState('left')) {
		if (!this.controls.left) {
			// Record the new state
			this.controls.left = true;
		}
	} else {
		if (this.controls.left) {
			// Record the new state
			this.controls.left = false;
			this._box2dBody.SetAngularVelocity(0);
		}
	}

	if (ige.input.actionState('right')) {
		if (!this.controls.right) {
			// Record the new state
			this.controls.right = true;
		}
	} else {
		if (this.controls.right) {
			// Record the new state
			this.controls.right = false;
			this._box2dBody.SetAngularVelocity(0);
		}
	}

	if (ige.input.actionState('thrust')) {
		if (!this.controls.thrust) {
			// Record the new state
			this.controls.thrust = true;
		}
	} else {
		if (this.controls.thrust) {
			// Record the new state
			this.controls.thrust = false;
		}
	}

	if (this.controls.left) {
		this._box2dBody.SetAngularVelocity(-2.5);
		//this.rotateBy(0, 0, Math.radians(-0.2 * ige._tickDelta));
	}

	if (this.controls.right) {
		this._box2dBody.SetAngularVelocity(2.5);
		//this.rotateBy(0, 0, Math.radians(0.2 * ige._tickDelta));
	}

	if (this.controls.thrust && this._fuel > 0) {
		var radians = this._rotate.z + Math.radians(-90),
			thrustVector = new ige.box2d.b2Vec2(Math.cos(radians) * this._thrustPower, Math.sin(radians) * this._thrustPower);

		this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
		this._box2dBody.SetAwake(true);

		// Enable the particle emitter
		this.thrustEmitter.start();

		// Use some fuel
		this._fuel -= 0.005 * ige._tickDelta;
	} else {
		// Disable the particle emitter
		this.thrustEmitter.stop();
	}

	if (ige.input.actionState('drop')) {
		if (this._carryingOrb) {
			this.dropOrb();
		}
	}
};