/**
 * Adds mouse control to the entity this component is added to.
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

		// Listen for the mouse up event
		ige.input.on('mouseUp', function () { self._mouseUp(); });
	},

	/**
	 * Handles what we do when a mouseUp event is fired from the engine.
	 * @param event
	 * @private
	 */
	_mouseUp: function () {
		// Get the tile co-ordinates that the mouse is currently over
		var endTile = ige.$('tileMap1').mouseToTile();

		// Tell the entity to start pathing along the new path
		this._entity.path
			.add(endTile.x, endTile.y, 0)
			.start();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }