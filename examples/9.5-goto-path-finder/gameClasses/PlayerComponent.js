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
		// Get the tile co-ordinates that the mouse is currently over
		var tilePoint = ige.$('tileMap1').mouseToTile(),
			currentPosition = this._entity._translate,
			currentTile,
			newPath;

		// Calculate which tile our character is currently "over"
		currentTile = this._entity._parent.pointToTile(currentPosition.toIso());

		console.log('Current translate: ', currentPosition.x, currentPosition.y);
		console.log('Pathing from ', currentTile.x, currentTile.y, 'to', tilePoint.x, tilePoint.y);

		// Create a path from the current position to the target tile
		newPath = ige.client.pathFinder.aStar(ige.client.collisionMap1, currentTile, tilePoint, function (tileData) {
			// If the collision map tile data is set to 1, don't allow a path along it
			return tileData !== 1;
		}, true, false);

		console.log(newPath);

		// Tell the entity to start pathing along the new path
		this._entity
			.path.clear()
			.path.add(newPath)
			.path.start();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }