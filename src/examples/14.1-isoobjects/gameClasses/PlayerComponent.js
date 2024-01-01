/**
 * Adds keyboard control to the entity this component is added to.
 * @type {IgeClass}
 */
var PlayerComponent = IgeClass.extend({
	classId: 'PlayerComponent',
	componentId: 'player',

	init: function (entity, options) {
		var self = this;

		// Store the entity that this component has been added to
		this._entity = entity;

		// Store any options that were passed to us
		this._options = options;

		// Setup the control system
		ige.components.input.mapAction('walkLeft', ige.components.input.key.left);
		ige.components.input.mapAction('walkRight', ige.components.input.key.right);
		ige.components.input.mapAction('walkUp', ige.components.input.key.up);
		ige.components.input.mapAction('walkDown', ige.components.input.key.down);

		// Add the playerComponent behaviour to the entity
		this._entity.addBehaviour('playerComponent_behaviour', this._behaviour);
	},

	_behaviour: function (ctx) {
		if (ige.components.input.actionState('walkLeft')) {
			this.velocity.x(-0.1)
				.velocity.y(0);
		} else if (ige.components.input.actionState('walkRight')) {
			this.velocity.x(0.1)
				.velocity.y(0);
		} else if (ige.components.input.actionState('walkUp')) {
			this.velocity.x(0)
				.velocity.y(-0.1);
		} else if (ige.components.input.actionState('walkDown')) {
			this.velocity.x(0)
				.velocity.y(0.1);
		} else {
			this.velocity.x(0)
				.velocity.y(0);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }
