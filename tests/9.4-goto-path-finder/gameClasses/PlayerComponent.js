/**
 * Adds mouse control to the entity this component is added to.
 * @type {IgeClass}
 */
var PlayerComponent = IgeClass.extend({
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
		// Get the tile co-ordinates that the mouse is currently over
		var tilePoint = ige.$('tileMap1').mouseToTile(),
			currentPosition = this._entity._translate,
			currentTile,
			newPath;

		// Clear any previous paths
		this._entity
			.path.clear();

		// Calculate which tile our character is currently "over"
		currentTile = new IgePoint(
			Math.floor(currentPosition.x / this._entity._parent._tileWidth),
			Math.floor(currentPosition.y / this._entity._parent._tileHeight),
			0
		);

		// Create a path from the current position to the target tile
		newPath = ige.client.pathFinder.aStar(ige.client.collisionMap1, currentTile, tilePoint, function (tileData) {
			// If the collision map tile data is set to 1, don't allow a path along it
			return tileData !== 1;
		}, true, false);

		this._entity
			.path.add(newPath)
			.path.start();

		/*this._entity.walkTo(
			tilePoint.x,
			tilePoint.y
		);*/
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }