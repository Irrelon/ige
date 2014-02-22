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
		ige.input.on('mouseUp', function (event, x, y, button) { self._mouseUp(event, x, y, button); });
	},

	/**
	 * Handles what we do when a mouseUp event is fired from the engine.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event, x, y, button) {
		// We get the tile's world XY and then convert it from iso to 2d
		// with a call to "to2d()" because the tilemap is isometric and
		// the walkTo method uses 2d co-ordinates!
		var tilePoint = ige.$('tileMap1').mouseTilePoint();

		this._entity.walkTo(
			tilePoint.x,
			tilePoint.y
		);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }