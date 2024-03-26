/**
 * Adds keyboard control to the entity this component is added to.
 * @type {IgeClass}
 */
var PlayerComponent = IgeClass.extend({
	classId: "PlayerComponent",
	componentId: "player",

	init: function (entity, options) {
		var self = this;

		// Store the entity that this component has been added to
		this._entity = entity;

		// Store any options that were passed to us
		this._options = options;

		// Setup the control system
		ige.components.input.mapAction("walkLeft", ige.components.input.key.left);
		ige.components.input.mapAction("walkRight", ige.components.input.key.right);
		ige.components.input.mapAction("walkUp", ige.components.input.key.up);
		ige.components.input.mapAction("walkDown", ige.components.input.key.down);
		ige.components.input.mapAction("jump", ige.components.input.key.space);

		// Add the playerComponent behaviour to the entity
		this._entity.addBehaviour("playerComponent_behaviour", this._behaviour);
	},

	_behaviour: function (ctx) {
		var vel = 200 / ige.cannon._scaleRatio;

		// Keep the entity flat at all times
		this._cannonBody.quaternion.x = 0;
		this._cannonBody.quaternion.y = 0;
		this._cannonBody.quaternion.z = 0;
		this._cannonBody.quaternion.w = 1;

		if (ige.components.input.actionState("walkLeft")) {
			this._cannonBody.velocity.set(-vel, this._cannonBody.velocity.y, this._cannonBody.velocity.z);
			this._cannonBody.wakeUp();
		} else if (ige.components.input.actionState("walkRight")) {
			this._cannonBody.velocity.set(vel, this._cannonBody.velocity.y, this._cannonBody.velocity.z);
			this._cannonBody.wakeUp();
		}

		if (ige.components.input.actionState("walkUp")) {
			this._cannonBody.velocity.set(this._cannonBody.velocity.x, -vel, this._cannonBody.velocity.z);
			this._cannonBody.wakeUp();
		} else if (ige.components.input.actionState("walkDown")) {
			this._cannonBody.velocity.set(this._cannonBody.velocity.x, vel, this._cannonBody.velocity.z);
			this._cannonBody.wakeUp();
		}

		if (ige.components.input.actionState("jump")) {
			this._cannonBody.velocity.set(this._cannonBody.velocity.x, this._cannonBody.velocity.y, vel * 1.5);
			this._cannonBody.wakeUp();
		}
	}
});

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = PlayerComponent;
}
