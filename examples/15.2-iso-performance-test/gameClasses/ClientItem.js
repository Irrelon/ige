var ClientItem = IgeEntity.extend({
	classId: 'ClientItem',

	init: function (tileX, tileY, tileWidth, tileHeight) {
		IgeEntity.prototype.init.call(this);

		// Store the tile details for this item in
		// it's internal data object
		this.data('tileX', tileX)
			.data('tileY', tileY)
			.data('tileWidth', tileWidth)
			.data('tileHeight', tileHeight);
	},

	/**
	 * Places the item down on the map by setting the tiles it
	 * is "over" as occupied by the item on the tile map.
	 * @return {*}
	 */
	place: function () {
		// Call the occupyTile method with the tile details.
		// This method doesn't exist in IgeEntity but is instead
		// added to an entity when that entity is mounted to a
		// tile map. The method tells the tile map that the
		// entity is mounted to that the tiles specified are now
		// taken up by this entity.
		this.occupyTile(
			this.data('tileX'),
			this.data('tileY'),
			this.data('tileWidth'),
			this.data('tileHeight')
		);

		this.data('placed', true);

		return this;
	},

	/**
	 * Moves the tile placement of the item from it's current
	 * tile location to the new tile location specified. Also
	 * translates the entity.
	 * @param tileX
	 * @param tileY
	 * @return {*}
	 */
	moveTo: function (tileX, tileY) {
		if (this.data('placed')) {
			// Un-occupy the current tiles
			this.unOccupyTile(
				this.data('tileX'),
				this.data('tileY'),
				this.data('tileWidth'),
				this.data('tileHeight')
			);

			// Set the new tile position
			this.data('tileX', tileX)
				.data('tileY', tileY);

			this.occupyTile(
				this.data('tileX'),
				this.data('tileY'),
				this.data('tileWidth'),
				this.data('tileHeight')
			);

			this.translateToTile(
				this.data('tileX'),
				this.data('tileY')
			);
		}

		return this;
	},

	/**
	 * Handles destroying the entity from memory.
	 */
	destroy: function () {
		// Un-occupy the tiles this entity currently occupies
		if (this.data('placed')) {
			this.unOccupyTile(
				this.data('tileX'),
				this.data('tileY'),
				this.data('tileWidth'),
				this.data('tileHeight')
			);

			this.data('placed', false);
		}

		// Call the parent class destroy method
		IgeEntity.prototype.destroy.call(this);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ClientItem; }