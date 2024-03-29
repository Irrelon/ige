var Ship = IgeEntity.extend({
	classId: "Ship",

	init: function (id) {
		IgeEntity.prototype.init.call(this);

		var self = this;

		if (id) {
			this.id(id);
		}

		this.scaleTo(4, 4, 4);

		if (isClient) {
			this.material(new THREE.MeshFaceMaterial()).model(modelSpaceFrigate6);
		}

		/*// Mount a turret to the ship entity
		new IgeEntity()
			.id(this.id() + '_turret')
			.translateTo(0, -2.6, 1.8)
			.rotateTo(0, 0, Math.radians(0))
			.scaleTo(0.2, 0.2, 0.2)
			.material(new THREE.MeshFaceMaterial())
			.model(modelTurret)
			.addBehaviour('mouseAim', TurretMouseAim)
			.mount(self.obj[0]);*/

		this.controls = {
			left: false,
			right: false,
			thrust: false
		};

		if (isServer) {
			this.addComponent(IgeVelocityComponent);
		}

		// Define the data sections that will be included in the stream
		this.streamSections(["transform", "score"]);
	},

	/**
	 * Override the default IgeEntity class streamSectionData() method
	 * so that we can check for the custom1 section and handle how we deal
	 * with it.
	 * @param {String} sectionId A string identifying the section to
	 * handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent
	 * from the server to the client for this entity.
	 * @return {*}
	 */
	streamSectionData: function (sectionId, data) {
		// Check if the section is one that we are handling
		if (sectionId === "score") {
			// Check if the server sent us data, if not we are supposed
			// to return the data instead of set it
			if (data) {
				// We have been given new data!
				this._score = data;
			} else {
				// Return current data
				return this._score;
			}
		} else {
			// The section was not one that we handle here, so pass this
			// to the super-class streamSectionData() method - it handles
			// the "transform" section by itself
			return IgeEntity.prototype.streamSectionData.call(this, sectionId, data);
		}
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		/* CEXCLUDE */
		if (isServer) {
			if (this.controls.left) {
				this.rotateBy(0, 0, Math.radians(-0.2 * ige._tickDelta));
			}

			if (this.controls.right) {
				this.rotateBy(0, 0, Math.radians(0.2 * ige._tickDelta));
			}

			if (this.controls.thrust) {
				this.velocity.byAngleAndPower(this._rotate.z + Math.radians(-90), 0.6);
			} else {
				this.velocity.x(0);
				this.velocity.y(0);
			}
		}
		/* CEXCLUDE */

		if (isClient) {
			if (ige.components.input.actionState("left")) {
				if (!this.controls.left) {
					// Record the new state
					this.controls.left = true;

					// Tell the server about our control change
					ige.components.network.send("playerControlLeftDown");
				}
			} else {
				if (this.controls.left) {
					// Record the new state
					this.controls.left = false;

					// Tell the server about our control change
					ige.components.network.send("playerControlLeftUp");
				}
			}

			if (ige.components.input.actionState("right")) {
				if (!this.controls.right) {
					// Record the new state
					this.controls.right = true;

					// Tell the server about our control change
					ige.components.network.send("playerControlRightDown");
				}
			} else {
				if (this.controls.right) {
					// Record the new state
					this.controls.right = false;

					// Tell the server about our control change
					ige.components.network.send("playerControlRightUp");
				}
			}

			if (ige.components.input.actionState("thrust")) {
				if (!this.controls.thrust) {
					// Record the new state
					this.controls.thrust = true;

					// Tell the server about our control change
					ige.components.network.send("playerControlThrustDown");
				}
			} else {
				if (this.controls.thrust) {
					// Record the new state
					this.controls.thrust = false;

					// Tell the server about our control change
					ige.components.network.send("playerControlThrustUp");
				}
			}
		}

		// Call the IgeEntity (super-class) tick() method
		IgeEntity.prototype.tick.call(this, ctx);
	}
});

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = Ship;
}
