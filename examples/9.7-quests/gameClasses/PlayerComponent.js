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
		return;
		// Get the tile co-ordinates that the mouse is currently over
		var endTile = ige.$('tileMap1').mouseToTile(),
			currentPosition = this._entity._translate,
			startTile,
			newPath,
			endPoint = this._entity.path.getEndPoint();

		// Check if we have a current path, if so, add to it
		if (endPoint) {
			// Use the end point of the existing path as the
			// start point of the new path
			startTile = endPoint;
		} else {
			// Calculate which tile our character is currently "over"
			if (this._entity._parent.isometricMounts()) {
				startTile = this._entity._parent.pointToTile(currentPosition.toIso());
			} else {
				startTile = this._entity._parent.pointToTile(currentPosition);
			}
		}

		// Create a path from the current position to the target tile
		newPath = ige.client.pathFinder.generate(ige.client.tileMap1, startTile, endTile, function (tileData, tileX, tileY) {
			// If the map tile data is set to 1, don't allow a path along it
			return tileData !== 1;
		}, true, true);

		// Tell the entity to start pathing along the new path
		this._entity
			//.path.clear()
			.path.add(newPath)
			.path.start();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }