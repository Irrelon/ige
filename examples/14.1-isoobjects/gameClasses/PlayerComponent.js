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
		ige.input.mapAction('walkLeft', ige.input.key.left);
		ige.input.mapAction('walkRight', ige.input.key.right);
		ige.input.mapAction('walkUp', ige.input.key.up);
		ige.input.mapAction('walkDown', ige.input.key.down);

		// Add the playerComponent behaviour to the entity
		this._entity.addBehaviour('playerComponent_behaviour', this._behaviour);
	},

	_behaviour: function (ctx) {
		if (ige.input.actionState('walkLeft')) {
			this.velocity.x(-0.1)
				.velocity.y(0);
		} else if (ige.input.actionState('walkRight')) {
			this.velocity.x(0.1)
				.velocity.y(0);
		} else if (ige.input.actionState('walkUp')) {
			this.velocity.x(0)
				.velocity.y(-0.1);
		} else if (ige.input.actionState('walkDown')) {
			this.velocity.x(0)
				.velocity.y(0.1);
		} else {
			this.velocity.x(0)
				.velocity.y(0);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }