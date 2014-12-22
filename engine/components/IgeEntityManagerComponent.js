var IgeEntityManagerComponent = IgeClass.extend({
	classId: 'IgeEntityManagerComponent',
	componentId: 'entityManager',

	/**
	 * @constructor
	 * @param {Object} entity The parent object that this component is being added to.
	 * @param {Object=} options An optional object that is passed to the component when it is being initialised.
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Check we are being added to a tile map
		if (!this._entity.pointToTile) {
			this.log('Warning, IgeEntityManagerComponent is only meant to be added to a tile map!', 'warning');
		}

		this._maps = [];
		this._overwatchMode = 0;
		this._removeMode = 0;
		this._createArr = [];
		this._removeArr = [];

		entity.addBehaviour('entityManager', this._behaviour);
	},

	/**
	 * Adds a map that will be used to read data and convert
	 * to entities as the visible map area is moved.
	 * @param {IgeTileMap2d=} map
	 * @return {*}
	 */
	addMap: function (map) {
		if (map !== undefined) {
			this._maps.push(map);
		}

		return this._entity;
	},

	/**
	 * Gets / sets the boolean flag determining if the entity
	 * manager is enabled or not.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	active: function (val) {
		if (val !== undefined) {
			this._active = val;
			return this._entity;
		}

		return this._active;
	},

	/**
	 * Gets / sets the number of entities the entity manager can
	 * create per tick. If the number of entities that need to be
	 * created is greater than this number they will be queued
	 * and processed on the next tick.
	 * @param val
	 * @return {*}
	 */
	maxCreatePerTick: function (val) {
		if (val !== undefined) {
			this._maxCreatePerTick = val;
			return this._entity;
		}

		return this._maxCreatePerTick;
	},

	/**
	 * Gets / sets the number of entities the entity manager can
	 * remove per tick. If the number of entities that need to be
	 * removed is greater than this number they will be queued
	 * and processed on the next tick.
	 * @param val
	 * @return {*}
	 */
	maxRemovePerTick: function (val) {
		if (val !== undefined) {
			this._maxRemovePerTick = val;
			return this._entity;
		}

		return this._maxRemovePerTick;
	},

	/**
	 * Gets / sets the overwatch mode for the entity manager. This
	 * is the mode that the manager will use when monitoring the
	 * entities under it's control to determine if any should be
	 * removed or not.
	 * @param {Number=} val Overwatch mode, defaults to 0.
	 * @return {*}
	 */
	overwatchMode: function (val) {
		if (val !== undefined) {
			this._overwatchMode = val;
			return this._entity;
		}

		return this._overwatchMode;
	},

	/**
	 * Adds a callback method that is called before an entity is
	 * created and asks the callback to return true if the entity
	 * should be allowed to be created, or false if not.
	 * @param {Function=} val The callback method.
	 * @return {*}
	 */
	createCheck: function (val) {
		if (val !== undefined) {
			this._createCheck = val;
			return this._entity;
		}

		return this._createCheck;
	},

	/**
	 * Adds a callback method that is called to allow you to execute
	 * the required code to create the desired entity from the map
	 * data you are being passed.
	 * @param {Function=} val The callback method.
	 * @return {*}
	 */
	createEntityFromMapData: function (val) {
		if (val !== undefined) {
			this._createEntityFromMapData = val;
			return this._entity;
		}

		return this._createEntityFromMapData;
	},

	/**
	 * Adds a callback method that is called before an entity is removed
	 * and if the callback returns true then the entity will be removed
	 * or if false, will not.
	 * @param {Function=} val The callback method.
	 * @return {*}
	 */
	removeCheck: function (val) {
		if (val !== undefined) {
			this._removeCheck = val;
			return this._entity;
		}

		return this._removeCheck;
	},

	/**
	 * Get / sets the entity that will be used to determine the
	 * center point of the area to manage. This allows the
	 * area to become dynamic based on this entity's position.
	 * @param entity
	 * @return {*}
	 */
	trackTranslate: function (entity) {
		if (entity !== undefined) {
			this._trackTranslateTarget = entity;
			return this;
		}

		return this._trackTranslateTarget;
	},

	/**
	 * Stops tracking the current tracking target's translation.
	 */
	unTrackTranslate: function () {
		delete this._trackTranslateTarget;
	},

	/**
	 * Gets / sets the center position of the management area.
	 * @param {Number=} x
	 * @param {Number=} y
	 * @return {*}
	 */
	areaCenter: function (x, y) {
		if (x !== undefined && y !== undefined) {
			// Adjust the passed x, y to account for this
			// texture map's translation
			var ent = this._entity,
				offset;

			if (ent._mode === 0) {
				// 2d mode
				offset = ent._translate;
			}

			if (ent._mode === 1) {
				// Iso mode
				offset = ent._translate.toIso();
			}

			x -= offset.x;
			y -= offset.y;

			this._areaCenter = new IgePoint(x, y, 0);
			return this._entity;
		}

		return this._areaCenter;
	},

	/**
	 * Gets / sets the area rectangle of the management area where
	 * entities outside this area are considered for removal and map
	 * data that falls inside this area is considered for entity
	 * creation.
	 * @param {Number=} x
	 * @param {Number=} y
	 * @param {Number=} width
	 * @param {Number=} height
	 * @return {*}
	 */
	areaRect: function (x, y, width, height) {
		if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
			this._areaRect = new IgeRect(x, y, width, height);
			return this._entity;
		}

		return this._areaRect;
	},

	areaRectAutoSize: function (val, options) {
		if (val !== undefined) {
			this._areaRectAutoSize = val;
			this._areaRectAutoSizeOptions = options;
			return this._entity;
		}

		return this._areaRectAutoSize;
	},

	/**
	 * Returns the current management area.
	 * @return {IgeRect}
	 */
	currentArea: function () {
		// Check if we are tracking an entity that is used to
		// set the center point of the area
		if (this._trackTranslateTarget) {
			// Calculate which tile our character is currently "over"
			if (this._trackTranslateTarget.isometric() === true) {
				entTranslate = this._trackTranslateTarget._translate.toIso();
			} else {
				entTranslate = this._trackTranslateTarget._translate;
			}

			this.areaCenter(entTranslate.x, entTranslate.y);
		}

		var areaRect = this._areaRect,
			areaCenter = this._areaCenter;

		if (areaRect && areaCenter) {
			return new IgeRect(Math.floor(areaRect.x + areaCenter.x), Math.floor(areaRect.y + areaCenter.y), Math.floor(areaRect.width), Math.floor(areaRect.height));
		} else {
			return new IgeRect(0, 0, 0, 0);
		}
	},

	/**
	 * Gets / sets the mode that entities will be removed with.
	 * If set to 0 (default) the entities will be removed via a
	 * call to their destroy() method. If set to 1, entities will
	 * be unmounted via a call to unMount(). This means that their
	 * associated box2d bodies will not be removed from the
	 * simulation if in mode 1.
	 * @param val
	 * @return {*}
	 */
	removeMode: function (val) {
		if (val !== undefined) {
			this._removeMode = val;
			return this._entity;
		}

		return this._removeMode;
	},

	/**
	 * The behaviour method executed each tick.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		var self = this.entityManager,
			currentArea,
			currentAreaTiles,
			arr = this._children,
			arrCount = arr.length,
			item,
			maps = self._maps,
			map,
			mapIndex,
			mapData,
			currentTile,
			renderX, renderY,
			renderWidth, renderHeight,
			x, y,
			tileData,
			renderSize,
			ratio;

		if ((!self._areaRect || ige._resized) && self._areaRectAutoSize) {
			self._resizeEvent();
		}

		currentArea = self.currentArea();

		if (self._areaCenter && self._areaRect && !currentArea.compare(self._lastArea)) {
			////////////////////////////////////
			// ENTITY REMOVAL CHECKS          //
			////////////////////////////////////

			/*// Check if the area metrics have changed
			if (this._overwatchMode === 0 && (!currentArea.compare(self._lastArea))) {
				// Overwatch mode is zero so only scan for entities to remove
				// if the area metrics have changed.
			}

			if (self._overwatchMode === 1) {
				// Actively scan every tick for entities to remove
				while (arrCount--) {
					item = arr[arrCount];

					// Check if the item has an aabb method
					if (item.aabb) {
						// Check the entity to see if its bounds are "inside" the
						// manager's visible area
						if (!currentArea.rectIntersect(item.aabb())) {
							// The item is outside the manager's area so
							// ask the removeCheck callback if we should
							// remove the entity
							if (!self._removeCheck || self._removeCheck(item)) {
								// Queue the entity for removal
								self._removeArr.push(item);
							}
						}
					}
				}
			}*/

			currentTile = this.pointToTile(self._areaCenter);
			renderX = currentTile.x;
			renderY = currentTile.y;
			renderWidth = Math.ceil(currentArea.width / this._tileWidth);
			renderHeight = Math.ceil(currentArea.height / this._tileHeight);

			currentArea.x -= (this._tileWidth);
			currentArea.y -= (this._tileHeight / 2);
			currentArea.width += (this._tileWidth * 2);
			currentArea.height += (this._tileHeight);

			// Check if we are rendering in 2d or isometric mode
			if (this._mountMode === 0) {
				// 2d
				currentAreaTiles = new IgeRect(
					renderX - Math.floor(renderWidth / 2) - 1,
					renderY - Math.floor(renderHeight / 2) - 1,
					renderX + Math.floor(renderWidth / 2) + 1 - (renderX - Math.floor(renderWidth / 2) - 1),
					renderY + Math.floor(renderHeight / 2) + 1 - (renderY - Math.floor(renderHeight / 2) - 1)
				);
			}

			if (this._mountMode === 1) {
				// Isometric
				renderSize = Math.abs(renderWidth) > Math.abs(renderHeight) ? renderWidth : renderHeight;
				ratio = 0.6;
				currentAreaTiles = new IgeRect(
					renderX - Math.floor(renderSize * ratio),
					renderY - Math.floor(renderSize * ratio),
					renderX + Math.floor(renderSize * ratio) + 1 - (renderX - Math.floor(renderSize * ratio)),
					renderY + Math.floor(renderSize * ratio) + 1 - (renderY - Math.floor(renderSize * ratio))
				);
			}

			// Generate the bounds rectangle
			if (this._drawBounds) {
				ctx.strokeStyle = '#ff0000';
				ctx.strokeRect(currentArea.x, currentArea.y, currentArea.width, currentArea.height);

				this._highlightTileRect = currentAreaTiles;
			}

			////////////////////////////////////
			// ENTITY REMOVAL CHECKS          //
			////////////////////////////////////
			//this._highlightTileRect = currentAreaTiles;

			map = this.map;
			while (arrCount--) {
				item = arr[arrCount];

				if (!self._removeCheck || self._removeCheck(item)) {
					if (!currentAreaTiles.rectIntersect(item._occupiedRect)) {
						// The item is outside the manager's area so
						// ask the removeCheck callback if we should
						// remove the entity

						// Queue the entity for removal
						self._removeArr.push(item);
					}
				}
			}

			////////////////////////////////////
			// ENTITY CREATION CHECKS         //
			////////////////////////////////////
			for (mapIndex in maps) {
				if (maps.hasOwnProperty(mapIndex)) {
					map = maps[mapIndex];
					mapData = map.map._mapData;
					// TODO: This can be optimised further by only checking the area that has changed

					for (y = currentAreaTiles.y; y < currentAreaTiles.y + currentAreaTiles.height; y++) {
						if (mapData[y]) {
							for (x = currentAreaTiles.x; x < currentAreaTiles.x + currentAreaTiles.width; x++) {
								// Grab the tile data to paint
								tileData = mapData[y][x];

								if (tileData) {
									if (!self._createCheck || self._createCheck(map, x, y, tileData)) {
										// Queue the entity for creation
										self._createArr.push([map, x, y, tileData]);
									}
								}
							}
						}
					}
				}
			}

			self._lastArea = currentArea;

			// Process the entity queues
			self.processQueues();
		}
	},

	processQueues: function () {
		var createArr = this._createArr,
			createCount = createArr.length,
			createLimit = this._maxCreatePerTick !== undefined ? this._maxCreatePerTick : 0,
			createEntityFunc = this._createEntityFromMapData,
			removeArr = this._removeArr,
			removeCount = removeArr.length,
			removeLimit = this._maxRemovePerTick !== undefined ? this._maxRemovePerTick : 0,
			i;

		if (createLimit && createCount > createLimit) { createCount = createLimit; }
		if (removeLimit && removeCount > removeLimit) { removeCount = removeLimit; }

		// Process remove queue
		for (i = 0; i < removeCount; i++) {
			if (this._removeMode === 0) {
				// Pop the first item off the array and destroy it
				removeArr.shift().destroy();
			}
		}

		// Process creation
		for (i = 0; i < createCount; i++) {
			// Pop the first item off the array and pass it as arguments
			// to the entity creation method assigned to this manager
			createEntityFunc.apply(this, createArr.shift());
		}
	},

	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		// Set width / height of scene to match parent
		if (this._areaRectAutoSize) {
			var geom = this._entity._parent._geometry,
				additionX = 0, additionY = 0;

			if (this._areaRectAutoSizeOptions) {
				if (this._areaRectAutoSizeOptions.bufferMultiple) {
					additionX = (geom.x * this._areaRectAutoSizeOptions.bufferMultiple.x) - geom.x;
					additionY = (geom.y * this._areaRectAutoSizeOptions.bufferMultiple.y) - geom.y;
				}

				if (this._areaRectAutoSizeOptions.bufferPixels) {
					additionX = this._areaRectAutoSizeOptions.bufferPixels.x;
					additionY = this._areaRectAutoSizeOptions.bufferPixels.y;
				}
			}

			this.areaRect(-Math.floor((geom.x + additionX) / 2), -Math.floor((geom.y + additionY) / 2), geom.x + additionX, geom.y + additionY);

			// Check if caching is enabled
			if (this._caching > 0) {
				this._resizeCacheCanvas();
			}
		}
	}
});