/**
 * Adds keyboard control to the entity this component is added to.
 * @type {IgeClass}
 */
var PlayerComponent = IgeClass.extend({
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

		// Listen for the key up event
		ige.input.on('keyUp', function (event, keyCode) { self._keyUp(event, keyCode); });

		// Add the playerComponent behaviour to the entity
		this._entity.addBehaviour('playerComponent_behaviour', this._behaviour);
	},

	_keyUp: function (event, keyCode) {
		if (keyCode === ige.input.key.space) {
			// Change the character
			this._entity._characterType++;

			if (this._entity._characterType > 7) {
				this._entity._characterType = 0;
			}

			this._entity.setType(this._entity._characterType);
		}
	},

	_behaviour: function (ctx) {
		if (ige.input.actionState('walkLeft')) {
			this.velocity.x(-0.1)
				.velocity.y(0)
				.animation.select('walkLeft');
		} else if (ige.input.actionState('walkRight')) {
			this.velocity.x(0.1)
				.velocity.y(0)
				.animation.select('walkRight');
		} else if (ige.input.actionState('walkUp')) {
			this.velocity.x(0)
				.velocity.y(-0.1)
				.animation.select('walkUp');
		} else if (ige.input.actionState('walkDown')) {
			this.velocity.x(0)
				.velocity.y(0.1)
				.animation.select('walkDown');
		} else {
			this.velocity.x(0)
				.velocity.y(0)
				.animation.stop();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }