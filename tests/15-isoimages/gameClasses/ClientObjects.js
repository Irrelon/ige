var ClientObjects = {
	Bank: IgeInteractiveEntity.extend({
		classId: 'Bank',

		init: function (parent, tileX, tileY) {
			this._super();
			var self = this;

			this.isometric(true)
				.mount(parent)
				.texture(ige.client.gameTexture.bank)
				.widthByTile(1.50, true) // Called with lockAspect true so height is also set
				.size3d(2 * parent._tileWidth, 2 * parent._tileHeight, parent._tileHeight * 1.25)
				.translateToTile((tileX) + 0.5, (tileY) + 0.5, 0)
				.mouseOver(function () {self.highlight(true);})
				.mouseOut(function () {self.highlight(false);})
				.occupyTile(tileX, tileY, 2, 2);
		}
	}),

	Electricals: IgeInteractiveEntity.extend({
		classId: 'Electricals',

		init: function (parent, tileX, tileY) {
			this._super();
			var self = this;

			this.isometric(true)
				.mount(parent)
				.texture(ige.client.gameTexture.electricals)
				.widthByTile(2 * 0.9, true) // Called with lockAspect true so height is also set
				.size3d(2 * parent._tileWidth, 3 * parent._tileHeight, parent._tileHeight * 0.8)
				.translateToTile((tileX) + 0.5, (tileY) + 1, 0)
				.mouseOver(function () {self.highlight(true);})
				.mouseOut(function () {self.highlight(false);})
				.occupyTile(tileX, tileY, 2, 3);
		}
	}),

	Burgers: IgeInteractiveEntity.extend({
		classId: 'Burgers',

		init: function (parent, tileX, tileY) {
			this._super();
			var self = this;

			this.isometric(true)
				.mount(parent)
				.texture(ige.client.gameTexture.burgers)
				.anchor(5, 0)
				.widthByTile(1.50, true) // Called with lockAspect true so height is also set
				.size3d(2 * parent._tileWidth, 2 * parent._tileHeight, parent._tileHeight * 0.75)
				.translateToTile((tileX) + 0.5, (tileY) + 0.5, 0)
				.mouseOver(function () {self.highlight(true);})
				.mouseOut(function () {self.highlight(false);})
				.occupyTile(tileX, tileY, 2, 2);
		}
	}),

	SkyScraper: IgeInteractiveEntity.extend({
		classId: 'SkyScraper',

		init: function (parent, tileX, tileY) {
			this._super();
			var self = this;

			// Setup some initial internal data
			this.data('base', 'se')
				.data('floors', 0)
				.data('crane', 'se')
				.data('baseRef', null)
				.data('floorRef', [])
				.data('craneRef', null);

			// Create the base
			this.data('baseRef', new IgeEntity()
				.isometric(true)
				.mount(this)
				.texture(ige.client.gameTexture.base_se)
				.width(ige.client.gameTexture.base_se.image.width * 0.265 * (parent._tileWidth / 40))
				.height(ige.client.gameTexture.base_se.image.height * 0.265 * (parent._tileWidth / 40))
				.size3d(2 * parent._tileWidth, 2 * parent._tileHeight, 25 * (parent._tileWidth / 40))
				.translateTo(0, 0, 0)
				.anchor(0, -1.6 * (parent._tileWidth / 40))
				.group('skyscraper')

				.drawBounds(false)
			);

			// Set the skyscraper entity details
			this.isometric(true)
				.isometricMounts(true)
				.mount(parent)
				.size3d(2 * parent._tileWidth, 2 * parent._tileHeight, 25 * (parent._tileWidth / 40))
				.translateToTile((tileX) + 0.5, (tileY) + 0.5, 0)
				.mouseOver(function () { self.highlight(true); })
				.mouseOut(function () { self.highlight(false); })
				.drawBounds(true)
				.occupyTile(tileX, tileY, 2, 2)
				.opacity(1);
		},

		/**
		 * Highlights the building children
		 * @param bool
		 */
		highlight: function (bool) {
			this._children.each(function (entity) {
				entity.highlight(bool);
			});
		},

		/**
		 * Gets / sets the building base type (se, sw, ne, nw)
		 * @param val
		 */
		base: function (val) {
			this.data('base', val);
		},

		/**
		 * Directly assign the number of floors the building shoudl have.
		 * @param val
		 * @return {*}
		 */
		floors: function (val) {
			var floorDiff;

			if (val === this.data('floors')) {
				// No change in the number of floors
				return;
			}

			if (val > this.data('floors')) {
				// We're adding more floors
				floorDiff = val - this.data('floors');

				this.addFloors(floorDiff);
			}

			if (val < this.data('floors')) {
				// We're adding more floors
				floorDiff = this.data('floors') - val;

				this.removeFloors(floorDiff);
			}

			return this;
		},

		/**
		 * Add a number of floors to the building.
		 * @param numFloors
		 * @return {*}
		 */
		addFloors: function (numFloors) {
			// Create the skyscraper
			var floor, floorCount = this.data('floors');

			for (floor = floorCount; floor < floorCount + (numFloors); floor++) {
				this.data('floorRef')[floor] = new IgeEntity()
					.mount(this)
					.isometric(true)
					.layer(floor)
					.texture(ige.client.gameTexture.stacker_se)
					.width(ige.client.gameTexture.base_se.image.width * 0.265 * (this._parent._tileWidth / 40))
					.height(ige.client.gameTexture.base_se.image.height * 0.265 * (this._parent._tileHeight / 40))
					.size3d(2 * this._parent._tileWidth, 2 * this._parent._tileHeight, 25 * (this._parent._tileWidth / 40))
					.translateTo(0, 0, 25 * (floor + 1) * (this._parent._tileWidth / 40))
					.anchor(0, -1.6 * (this._parent._tileWidth / 40))
					.group('skyscraper')
					.drawBounds(false);
			}

			this.data('floors', floorCount + numFloors);

			if (this.data('craneRef')) {
				// Move the crane into position
				this.data('craneRef')
					.translateTo(
						0,
						0,
						12.5 * (this.data('floors') + 1)
					)
					.layer(this.data('floors') + 1);
			}

			// Adjust the skyscraper geometry to match the number of floors
			// so that it will depth-sort against other buildings correctly
			this.size3d(
				this.geometry3d.x,
				this.geometry3d.y,
				12.5 + (this.data('floors') * 25 * (this._parent._tileWidth / 40))
			);

			return this;
		},

		/**
		 * Remove a number of floors from the building.
		 * @param numFloors
		 * @return {*}
		 */
		removeFloors: function (numFloors) {
			var floor;

			if (this.data('floors') > 0) {
				if (this.data('floors') - numFloors < 0) {
					// Cannot remove more floors than there are!
					numFloors = this.data('floors');
				}

				for (floor = 1; floor <= numFloors; floor++) {
					this.data('floorRef')[this.data('floors') - floor].destroy();
					delete this.data('floorRef')[this.data('floors') - floor];
				}

				this._data.floors -= numFloors;

				// Adjust the skyscraper geometry to match the number of floors
				// so that it will depth-sort against other buildings correctly
				this.size3d(
					this.geometry3d.x,
					this.geometry3d.y,
					12.5 + (this.data('floors') * 25 * (this._parent._tileWidth / 40))
				);
			}

			if (this.data('craneRef')) {
				// Move the crane into position
				this.data('craneRef')
					.translateTo(
						0,
						0,
						12.5 * (this.data('floors') + 1)
					);
			}

			return this;
		},

		/**
		 * Set the type of crane the building should have (se, sw, ne, nw)
		 * @param val
		 * @return {*}
		 */
		crane: function (val) {
			if (val === this.data('crane')) {
				// No change to the crane
				return;
			}

			// Remove the current crane
			this.removeCrane();

			if (val) {
				// Add or change the crane
				this.addCrane(val);
			}

			return this;
		},

		/**
		 * Add a crane of a certain type to the building.
		 * @param val
		 * @return {*}
		 */
		addCrane: function (val) {
			if (!this.data('craneRef')) {
				var levelTextureId,
					anchorX,
					anchorY;

				this.data('crane', val);

				if (val === 'se') { levelTextureId = 'crane_se'; anchorX = 25; anchorY = 0; }
				if (val === 'sw') { levelTextureId = 'crane_sw'; anchorX = -25; anchorY = 0; }
				if (val === 'ne') { levelTextureId = 'crane_ne'; anchorX = 25; anchorY = -10; }
				if (val === 'nw') { levelTextureId = 'crane_nw'; anchorX = -25; anchorY = -10; }

				// Create the crane
				this.data('craneRef', new IgeEntity()
					.isometric(true)
					.mount(this)
					.texture(ige.client.gameTexture[levelTextureId])
					.width(ige.client.gameTexture[levelTextureId].image.width * 0.265 * (this._parent._tileWidth / 40))
					.height(ige.client.gameTexture[levelTextureId].image.height * 0.265 * (this._parent._tileHeight / 40))
					.size3d(20, 20, 55)
					.layer(this.data('floors') + 1)
					.group('skyscraper')
					.anchor(anchorX, anchorY)
					.translateTo(
						0,
						0,
						12.5 * (this.data('floors') + 1)
					)
					.drawBounds(false)
				);
			}

			return this;
		},

		/**
		 * Remove the current crane from the building.
		 * @return {*}
		 */
		removeCrane: function () {
			if (this.data('craneRef')) {
				this.data('craneRef').destroy();
				delete this._data.craneRef;
				delete this._data.crane;
			}

			return this;
		}
	})
};