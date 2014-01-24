var ClientObjects = {
	Bank: ClientItem.extend({
		classId: 'Bank',

		init: function (parent, tileX, tileY) {
			ClientItem.prototype.init.call(this, tileX, tileY, 2, 2);
			var self = this;

			// Setup the 3d bounds container (this)
			this.isometric(true)
				.mount(parent)
				.bounds3d(2 * parent._tileWidth, 2 * parent._tileHeight, parent._tileHeight * 1.25)
				.translateToTile(tileX, tileY, 0)
				.mouseOver(function () { this.drawBounds(true); this.drawBoundsData(true); })
				.mouseOut(function () { this.drawBounds(false); this.drawBoundsData(false); })
				.occupyTile(tileX, tileY, 2, 2);

			// Create the "image" entity
			this.imageEntity = new IgeEntity()
				.texture(ige.client.gameTexture.bank)
				.dimensionsFromCell()
				.scaleTo(0.3, 0.3, 1)
				.mount(this);
		},
		
		translateToTile: function (tileX, tileY) {
			return ClientItem.prototype.translateToTile.call(this, (tileX) + 0.5, (tileY) + 0.5, 0);
		}
	}),

	Electricals: ClientItem.extend({
		classId: 'Electricals',

		init: function (parent, tileX, tileY) {
			ClientItem.prototype.init.call(this, tileX, tileY, 3, 4);
			var self = this;

			// Setup the 3d bounds container (this)
			this.isometric(true)
				.mount(parent)
				.bounds3d(3 * parent._tileWidth, 4 * parent._tileHeight, parent._tileHeight * 0.8)
				.translateToTile(tileX, tileY, 0)
				.mouseOver(function () { this.drawBounds(true); this.drawBoundsData(true); })
				.mouseOut(function () { this.drawBounds(false); this.drawBoundsData(false); })
				.occupyTile(tileX, tileY, 3, 4);

			// Create the "image" entity
			this.imageEntity = new IgeEntity()
				.texture(ige.client.gameTexture.electricals)
				.dimensionsFromCell()
				.scaleTo(0.45, 0.45, 1)
				.mount(this);
		},
		
		translateToTile: function (tileX, tileY) {
			return ClientItem.prototype.translateToTile.call(this, (tileX) + 1, (tileY) + 1.5, 0);
		}
	}),

	Burgers: ClientItem.extend({
		classId: 'Burgers',

		init: function (parent, tileX, tileY) {
			ClientItem.prototype.init.call(this, tileX, tileY, 2, 2);
			var self = this;

			// Setup the 3d bounds container (this)
			this.isometric(true)
				.mount(parent)
				.bounds3d(2 * parent._tileWidth, 2 * parent._tileHeight, parent._tileHeight * 1.25)
				.translateToTile(tileX, tileY, 0)
				.mouseOver(function () { this.drawBounds(true); this.drawBoundsData(true); })
				.mouseOut(function () { this.drawBounds(false); this.drawBoundsData(false); })
				.occupyTile(tileX, tileY, 2, 2);

			// Create the "image" entity
			this.imageEntity = new IgeEntity()
				.texture(ige.client.gameTexture.burgers)
				.dimensionsFromCell()
				.scaleTo(0.3, 0.3, 1)
				//.anchor(-5, -20)
				.translateTo(2, 6, 0)
				.mount(this);
		},
		
		translateToTile: function (tileX, tileY) {
			return ClientItem.prototype.translateToTile.call(this, (tileX) + 0.5, (tileY) + 0.5, 0);
		}
	}),

	SkyScraper: ClientItem.extend({
		classId: 'SkyScraper',

		init: function (parent, tileX, tileY) {
			ClientItem.prototype.init.call(this, tileX, tileY, 2, 2);
			var self = this;

			// Setup some initial internal data
			this.data('base', 'se')
				.data('floors', 0)
				.data('crane', 'se')
				.data('baseRef', null)
				.data('floorRef', [])
				.data('craneRef', null);

			// Set the skyscraper entity details
			this.isometric(true)
				.isometricMounts(true)
				.bounds3d(2 * parent._tileWidth, 2 * parent._tileHeight, 25 * (parent._tileWidth / 40))
				.mouseOver(function () { this.highlight(true); this.drawBounds(true); this.drawBoundsData(true); })
				.mouseOut(function () { this.highlight(false); this.drawBounds(false); this.drawBoundsData(false); })
				.drawBounds(false)
				.drawBoundsData(false)
				.opacity(1)
				.mount(parent)
				.translateToTile((tileX) + 0.5, (tileY) + 0.5, 0)
				.occupyTile(tileX, tileY, 2, 2);

			// Create the base container
			this.data('baseRef', new IgeEntity()
				.isometric(true)
				.mount(this)
				.bounds3d(2 * parent._tileWidth, 2 * parent._tileHeight, 25 * (parent._tileWidth / 40))
				.translateTo(0, 0, 0)
				.anchor(0, -1.6 * (parent._tileWidth / 40))
				.category('skyscraper')
				.mouseOver(function () { this.highlight(true); this.drawBounds(true); this.drawBoundsData(true); })
				.mouseOut(function () { this.highlight(false); this.drawBounds(false); this.drawBoundsData(false); })
				.drawBounds(false)
				.drawBoundsData(false)
			);

			new IgeEntity()
				.texture(ige.client.gameTexture.base_se)
				.width(ige.client.gameTexture.base_se.image.width * 0.265 * (parent._tileWidth / 40))
				.height(ige.client.gameTexture.base_se.image.height * 0.265 * (parent._tileWidth / 40))
				.drawBounds(false)
				.drawBoundsData(false)
				.mount(this.data('baseRef'));
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
		 * Directly assign the number of floors the building should have.
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
				// Create the floor container
				this.data('floorRef')[floor] = new IgeEntity()
					.isometric(true)
					.layer(floor)
					.mount(this)
					.bounds3d(2 * this._parent._tileWidth, 2 * this._parent._tileHeight, 25 * (this._parent._tileWidth / 40))
					.translateTo(0, 0, 25 * (floor + 1) * (this._parent._tileWidth / 40))
					.anchor(0, -1.6 * (this._parent._tileWidth / 40))
					.category('skyscraper')
					.mouseOver(function () { this.highlight(true); this.drawBounds(true); this.drawBoundsData(true); })
					.mouseOut(function () { this.highlight(false); this.drawBounds(false); this.drawBoundsData(false); })
					.drawBounds(false)
					.drawBoundsData(false);

				new IgeEntity()
					.texture(ige.client.gameTexture.stacker_se)
					.width(ige.client.gameTexture.base_se.image.width * 0.265 * (this._parent._tileWidth / 40))
					.height(ige.client.gameTexture.base_se.image.height * 0.265 * (this._parent._tileHeight / 40))
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(this.data('floorRef')[floor]);
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
			this.bounds3d(
				this._bounds2d.x,
				this._bounds2d.y,
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
				this.bounds3d(
					this._bounds2d.x,
					this._bounds2d.y,
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
					.layer(this.data('floors') + 1)
					.mount(this)
					.bounds3d(20, 20, 55)
					.translateTo(
						0,
						0,
						12.5 * (this.data('floors') + 1)
					)
					.category('skyscraper')
					.mouseOver(function () { this.highlight(true); this.drawBounds(true); this.drawBoundsData(true); })
					.mouseOut(function () { this.highlight(false); this.drawBounds(false); this.drawBoundsData(false); })
					.drawBounds(false)
					.drawBoundsData(false)
				);

				new IgeEntity()
					.texture(ige.client.gameTexture[levelTextureId])
					.width(ige.client.gameTexture[levelTextureId].image.width * 0.265 * (this._parent._tileWidth / 40))
					.height(ige.client.gameTexture[levelTextureId].image.height * 0.265 * (this._parent._tileHeight / 40))
					.anchor(-anchorX, -anchorY)
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(this.data('craneRef'));
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
		},

		/**
		 * Sets the build process in motion that will add the number of
		 * floors specified, one at a time until the building is complete.
		 * The crane will also be changed until complete and then removed.
		 * @param floors
		 */
		build: function (floors) {
			var self = this;
			this.data('buildFloors', floors);
			setTimeout(function () {
				self._buildTick();
			}, 1000);
		},

		_buildTick: function () {
			var currentFloors = this.data('floors'),
				buildFloors = this.data('buildFloors'),
				self = this;

			if (currentFloors < buildFloors - 1) {
				this.addFloors(1);

				switch (this.data('crane')) {
					case 'se':
						this.crane('sw');
						break;

					case 'sw':
						this.crane('nw');
						break;

					case 'nw':
						this.crane('ne');
						break;

					case 'ne':
						this.crane('se');
						break;
				}

				// Set another timeout to re-call this method
				setTimeout(function () {
					self._buildTick();
				}, 1000);
			} else {
				// Add the last floor
				this.addFloors(1);

				// Building is complete, remove the crane
				this.removeCrane();
			}
		}
	})
};