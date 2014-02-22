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
		var vel = 6,
			direction = '';

		if (ige.input.actionState('walkUp')) {
			direction += 'N';
		}

		if (ige.input.actionState('walkDown')) {
			direction += 'S';
		}

		if (ige.input.actionState('walkLeft')) {
			direction += 'W';
		}

		if (ige.input.actionState('walkRight')) {
			direction += 'E';
		}

		switch (direction) {
			case 'N':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(0, -vel, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkUp');
				break;

			case 'S':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(0, vel, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkDown');
				break;

			case 'E':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(vel, 0, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkRight');
				break;

			case 'W':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(-vel, 0, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkLeft');
				break;

			case 'NE':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(vel, -vel, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkRight');
				break;

			case 'NW':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(-vel, -vel, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkLeft');
				break;

			case 'SE':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(vel, vel, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkRight');
				break;

			case 'SW':
				this._box2dBody.SetLinearVelocity(new IgePoint3d(-vel, vel, 0));
				this._box2dBody.SetAwake(true);
				this.animation.select('walkLeft');
				break;

			default:
				this._box2dBody.SetLinearVelocity(new IgePoint3d(0, 0, 0));
				this.animation.stop();
				break;
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }