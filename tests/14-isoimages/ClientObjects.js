var ClientObjects = {
	Bank: IgeInteractiveEntity.extend({
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
		init: function (parent, tileX, tileY) {
			this._super();
			var self = this;

			this.data('base', 'se')
				.data('floors', 0)
				.data('crane', 'se')
				.data('baseRef', null)
				.data('floorRef', [])
				.data('craneRef', null);

			// Create the base
			this.data('baseRef', new IgeInteractiveEntity()
				.isometric(true)
				.texture(ige.client.gameTexture.base_se)
				.width(ige.client.gameTexture.base_se.image.width * 0.265 * (parent._tileWidth / 40))
				.height(ige.client.gameTexture.base_se.image.height * 0.265 * (parent._tileWidth / 40))
				.size3d(2 * parent._tileWidth, 2 * parent._tileHeight, 25 * (parent._tileWidth / 40))
				.translateTo(0, 0, 0)
				.anchor(0, -1.6 * (parent._tileWidth / 40))
				.group('skyscraper')
				.mount(this)
				.drawBounds(false)
			);

			this.isometric(true)
				.mount(parent)
				.size3d(2 * parent._tileWidth, 2 * parent._tileHeight, 25 * (parent._tileWidth / 40))
				.translateToTile((tileX) + 0.5, (tileY) + 0.5, 0)
				.mouseOver(function () { self.highlight(true); })
				.mouseOut(function () { self.highlight(false); })
				.drawBounds(true)
				.occupyTile(tileX, tileY, 2, 2)
				.opacity(1);
		},

		highlight: function (bool) {
			this._children.each(function (entity) { entity.highlight(bool); });
		},

		base: function (val) {
			this.data('base', val);
		},

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

		addFloors: function (numFloors) {
			// Create the skyscraper
			var floor, floorCount = this.data('floors');

			for (floor = floorCount; floor < floorCount + (numFloors); floor++) {
				this.data('floorRef')[floor] = new IgeInteractiveEntity()
					.mount(this)
					.isometric(true)
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
				this.data('craneRef').translate(0, 0, -4.1 * (this.data('floors') + 1), false, true);
			}

			// Adjust the skyscraper geometry to match the number of floors
			// so that it will depth-sort against other buildings correctly
			this.size3d(this.geometry3d.x, this.geometry3d.y, 25 + (this.data('floors') * 25 * (this._parent._tileWidth / 40)));

			return this;
		},

		removeFloors: function (numFloors) {
			var floor;

			if (this.data('floors') > 0) {
				if (this.data('floors') - numFloors < 0) {
					// Cannot remove more floors than there are!
					numFloors = this.data('floors');
				}

				for (floor = 1; floor <= numFloors; floor++) {
					this.data.floorRef[this.data('floors') - floor].destroy();
					delete this.data.floorRef[this.data('floors') - floor];
				}

				this._data.floors -= numFloors;
			}

			if (this.data.craneRef) {
				// Move the crane into position
				this.data.craneRef.translate(0, 0, -4.1 * (this.data('floors') + 1), false, true);
			}

			return this;
		},

		crane: function (val) {
			if (val === this.data.crane) {
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

		addCrane: function (val) {
			var levelTextureId,
				originX,
				originY;

			this.data.crane = val;

			if (this.data.crane === 'se') { levelTextureId = 20; originX = 0.18; originY = 0.82; }
			if (this.data.crane === 'sw') { levelTextureId = 21; originX = 0.82; originY = 0.82; }
			if (this.data.crane === 'ne') { levelTextureId = 22; originX = 0.18; originY = 0.86; }
			if (this.data.crane === 'nw') { levelTextureId = 23; originX = 0.84; originY = 0.86; }

			// Create the base
			this.data.craneRef = new IgeEntity();
			this.data.craneRef.texture(gameTexture[levelTextureId]);
			this.data.craneRef.mode(1);
			this.data.craneRef.layer(3);
			this.data.craneRef.autoDepth(true);
			this.data.craneRef.scale(0.15, 0.15);
			this.data.craneRef.origin(originX, originY);
			this.data.craneRef.group('skyscraper');

			// Mount the skyscaper
			this.data.craneRef.mount(this._scene);

			// Move the crane into position
			this.data.craneRef.translate(this._transform[0], this._transform[1], this._transform[2] - 41 * (this.data('floors') + 1), false, false);

			return this;
		},

		removeCrane: function () {
			if (this.data.craneRef) {
				this.data.craneRef.destroy();
				delete this.data.craneRef;
				delete this.data.crane;
			}

			return this;
		},

		update: function () {
			// Remove any existing entities
			var arr = this._children,
				arrCount = arr.length,
				floor,
				levelEntity,
				levelTextureId;

			while (arrCount--) {
				arr[arrCount].destroy();
			}

			return this;
		}
	})
};