var IgeBox2dWorld = IgeEventingClass.extend({
	classId: 'IgeBox2dWorld',
	
	init: function (entity, options) {
		this.b2Color = Box2D.Common.b2Color;
		this.b2Vec2 = Box2D.Common.Math.b2Vec2;
		this.b2Math = Box2D.Common.Math.b2Math;
		this.b2Shape = Box2D.Collision.Shapes.b2Shape;
		this.b2BodyDef = Box2D.Dynamics.b2BodyDef;
		this.b2Body = Box2D.Dynamics.b2Body;
		this.b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
		this.b2Fixture = Box2D.Dynamics.b2Fixture;
		this.b2World = Box2D.Dynamics.b2World;
		this.b2MassData = Box2D.Collision.Shapes.b2MassData;
		this.b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
		this.b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
		this.b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
		this.b2ContactListener = Box2D.Dynamics.b2ContactListener;
		this.b2Distance = Box2D.Collision.b2Distance;
		this.b2Contact = Box2D.Dynamics.Contacts.b2Contact;
		this.b2FilterData = Box2D.Dynamics.b2FilterData;
		this.b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;
		
		this._entity = entity;
		
		options = options || {
			id: ige.newIdHex(),
			gravity: new this.b2Vec2(0, 0),
			sleep: true
		};
		
		this._id = options.id;
		this._sleep = options.sleep;
		this._scaleRatio = options.scaleRatio !== undefined ? options.scaleRatio : 30;
		this._gravity = options.gravity;
		this._mode = 0;

		this._removeWhenReady = [];
		
		this._world = new this.b2World(
			options.gravity,
			options.sleep
		);
	},
	
	/**
	 * Creates a Box2d fixture and returns it.
	 * @param params
	 * @return {b2FixtureDef}
	 */
	createFixture: function (params) {
		var tempDef = new this.b2FixtureDef(),
			param;

		for (param in params) {
			if (params.hasOwnProperty(param)) {
				if (param !== 'shape' && param !== 'filter') {
					tempDef[param] = params[param];
				}
			}
		}

		return tempDef;
	},

	/**
	 * Creates a Box2d body and attaches it to an IGE entity
	 * based on the supplied body definition.
	 * @param {IgeEntityBox2d} entity
	 * @param {Object} body
	 * @return {b2Body}
	 */
	createBody: function (entity, body) {
		var tempDef = new this.b2BodyDef(),
			param,
			tempBod,
			fixtureDef,
			tempFixture,
			finalFixture,
			tempShape,
			tempFilterData,
			i,
			finalX, finalY,
			finalWidth, finalHeight;

		// Process body definition and create a box2d body for it
		switch (body.type) {
			case 'static':
				tempDef.type = this.b2Body.b2_staticBody;
				break;

			case 'dynamic':
				tempDef.type = this.b2Body.b2_dynamicBody;
				break;
			
			case 'kinematic':
                tempDef.type = this.b2Body.b2_kinematicBody;
                break;
		}

		// Add the parameters of the body to the new body instance
		for (param in body) {
			if (body.hasOwnProperty(param)) {
				switch (param) {
					case 'type':
					case 'gravitic':
					case 'fixedRotation':
					case 'fixtures':
						// Ignore these for now, we process them
						// below as post-creation attributes
						break;

					default:
						tempDef[param] = body[param];
						break;
				}
			}
		}

		// Set the position
		tempDef.position = new this.b2Vec2(entity._translate.x / this._scaleRatio, entity._translate.y / this._scaleRatio);
		
		// Create the new body
		tempBod = this._world.CreateBody(tempDef);

		// Now apply any post-creation attributes we need to
		for (param in body) {
			if (body.hasOwnProperty(param)) {
				switch (param) {
					case 'gravitic':
						if (!body.gravitic) {
							tempBod.m_nonGravitic = true;
						}
						break;

					case 'fixedRotation':
						if (body.fixedRotation) {
							tempBod.SetFixedRotation(true);
						}
						break;

					case 'fixtures':
						if (body.fixtures && body.fixtures.length) {
							for (i = 0; i < body.fixtures.length; i++) {
								// Grab the fixture definition
								fixtureDef = body.fixtures[i];
	
								// Create the fixture
								tempFixture = this.createFixture(fixtureDef);
								tempFixture.igeId = fixtureDef.igeId;
	
								// Check for a shape definition for the fixture
								if (fixtureDef.shape) {
									// Create based on the shape type
									switch (fixtureDef.shape.type) {
										case 'circle':
											tempShape = new this.b2CircleShape();
											if (fixtureDef.shape.data && typeof(fixtureDef.shape.data.radius) !== 'undefined') {
												tempShape.SetRadius(fixtureDef.shape.data.radius / this._scaleRatio);
											} else {
												tempShape.SetRadius((entity._bounds2d.x / this._scaleRatio) / 2);
											}
											
											if (fixtureDef.shape.data) {
												finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
												finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
												
												tempShape.SetLocalPosition(new this.b2Vec2(finalX / this._scaleRatio, finalY / this._scaleRatio));
											}
											break;
	
										case 'polygon':
											tempShape = new this.b2PolygonShape();
											tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
											break;
	
										case 'rectangle':
											tempShape = new this.b2PolygonShape();
	
											if (fixtureDef.shape.data) {
												finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
												finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
												finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._bounds2d.x / 2);
												finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._bounds2d.y / 2);
											} else {
												finalX = 0;
												finalY = 0;
												finalWidth = (entity._bounds2d.x / 2);
												finalHeight = (entity._bounds2d.y / 2);
											}
	
											// Set the polygon as a box
											tempShape.SetAsOrientedBox(
												(finalWidth / this._scaleRatio),
												(finalHeight / this._scaleRatio),
												new this.b2Vec2(finalX / this._scaleRatio, finalY / this._scaleRatio),
												0
											);
											break;
									}
	
									if (tempShape) {
										tempFixture.shape = tempShape;
										finalFixture = tempBod.CreateFixture(tempFixture);
										finalFixture.igeId = tempFixture.igeId;
									}
								}
	
								if (fixtureDef.filter && finalFixture) {
									tempFilterData = new this.b2FilterData();
	
									if (fixtureDef.filter.categoryBits !== undefined) { tempFilterData.categoryBits = fixtureDef.filter.categoryBits; }
									if (fixtureDef.filter.maskBits !== undefined) { tempFilterData.maskBits = fixtureDef.filter.maskBits; }
									if (fixtureDef.filter.categoryIndex !== undefined) { tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex; }
	
									finalFixture.SetFilterData(tempFilterData);
								}
	
								if (fixtureDef.density !== undefined && finalFixture) {
									finalFixture.SetDensity(fixtureDef.density);
								}
							}
						} else {
							this.log('Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.', 'warning');
						}
						break;
				}
			}
		}

		// Store the entity that is linked to this body
		tempBod._entity = entity;

		// Add the body to the world with the passed fixture
		return tempBod;
	},

	/**
	 * Produces static box2d bodies from passed map data.
	 * @param {IgeTileMap2d} mapLayer
	 * @param {Function=} callback Returns true or false depending
	 * on if the passed map data should be included as part of the
	 * box2d static object data. This allows you to control what
	 * parts of the map data are to be considered for box2d static
	 * objects and which parts are to be ignored. If not passed then
	 * any tile with any map data is considered part of the static
	 * object data.
	 */
	staticsFromMap: function (mapLayer, callback) {
		if (mapLayer.map) {
			var tileWidth = mapLayer.tileWidth(),
				tileHeight = mapLayer.tileHeight(),
				posX, posY,
				rectArray, rectCount, rect;

			// Get the array of rectangle bounds based on
			// the map's data
			rectArray = mapLayer.scanRects(callback);
			rectCount = rectArray.length;

			while (rectCount--) {
				rect = rectArray[rectCount];

				posX = (tileWidth * (rect.width / 2));
				posY = (tileHeight * (rect.height / 2));

				new IgeEntityBox2d()
					.translateTo(rect.x * tileWidth + posX, rect.y * tileHeight + posY, 0)
					.width(rect.width * tileWidth)
					.height(rect.height * tileHeight)
					.drawBounds(true)
					.drawBoundsData(false)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});
			}
		} else {
			this.log('Cannot extract box2d static bodies from map data because passed map does not have a .map property!', 'error');
		}
	},

	/**
	 * Creates a contact listener with the specified callbacks. When
	 * contacts begin and end inside the box2d simulation the specified
	 * callbacks are fired.
	 * @param {Function} beginContactCallback The method to call when the contact listener detects contact has started.
	 * @param {Function} endContactCallback The method to call when the contact listener detects contact has ended.
	 * @param {Function} preSolve
	 * @param {Function} postSolve
	 */
	contactListener: function (beginContactCallback, endContactCallback, preSolve, postSolve) {
		var contactListener = new this.b2ContactListener();
		if (beginContactCallback !== undefined) {
			contactListener.BeginContact = beginContactCallback;
		}

		if (endContactCallback !== undefined) {
			contactListener.EndContact = endContactCallback;
		}

		if (preSolve !== undefined) {
			contactListener.PreSolve = preSolve;
		}

		if (postSolve !== undefined) {
			contactListener.PostSolve = postSolve;
		}
		this._world.SetContactListener(contactListener);
	},
	
	/**
	 * If enabled, sets the physics world into network debug mode which
	 * will stop the world from generating collisions but still allow us
	 * to see shape outlines as they are attached to bodies. Useful when
	 * your physics system is server-side but seeing client-side shape
	 * data is useful for debugging collisions.
	 * @param {Boolean} val
	 */
	networkDebugMode: function (val) {
		if (val !== undefined) {
			this._networkDebugMode = val;
			
			if (val === true) {
				// We are enabled so disable all physics contacts
				this.contactListener(
					// Begin contact
					function (contact) {},
					// End contact
					function (contact) {},
					// Pre-solve
					function (contact) {
						// Cancel the contact
						contact.SetEnabled(false);
					},
					// Post-solve
					function (contact) {}
				);
			} else {
				// Re-enable contacts
				this.contactListener();
			}
			
			return this;
		}
		
		return this._networkDebugMode;
	},

	/**
	 * Creates a debug entity that outputs the bounds of each box2d
	 * body during standard engine ticks.
	 * @param {IgeEntity} mountScene
	 */
	enableDebug: function (mountScene) {
		if (mountScene) {
			// Define the debug drawing instance
			var debugDraw = new this.b2DebugDraw();
			this._box2dDebug = true;

			debugDraw.SetSprite(ige._ctx);
			debugDraw.SetDrawScale(this._scaleRatio);
			debugDraw.SetFillAlpha(0.3);
			debugDraw.SetLineThickness(1.0);
			debugDraw.SetFlags(
				this.b2DebugDraw.e_controllerBit
				| this.b2DebugDraw.e_jointBit
				| this.b2DebugDraw.e_pairBit
				| this.b2DebugDraw.e_shapeBit
				//| this.b2DebugDraw.e_aabbBit
				//| this.b2DebugDraw.e_centerOfMassBit
			);

			// Set the debug draw for the world
			this._world.SetDebugDraw(debugDraw);

			// Create the debug painter entity and mount
			// it to the passed scene
			new igeClassStore.IgeBox2dDebugPainter()
				.depth(40000) // Set a really high depth
				.drawBounds(false)
				.mount(mountScene);
		} else {
			this.log('Cannot enable box2d debug drawing because the passed argument is not an object on the scenegraph.', 'error');
		}
	},

	/**
	 * Queues a body for removal from the physics world.
	 * @param body
	 */
	destroyBody: function (body) {
		this._removeWhenReady.push(body);
	},

	/**
	 * Gets / sets the callback method that will be called after
	 * every physics world step.
	 * @param method
	 * @return {*}
	 */
	updateCallback: function (method) {
		if (method !== undefined) {
			this._updateCallback = method;
			return this;
		}

		return this._updateCallback;
	},

	start: function () {
		var self = this;
		if (!this._active) {
			this._active = true;
			
			if (!this._networkDebugMode) {
				if (this._mode === 0) {
					// Add the box2d behaviour to the ige
					ige.addBehaviour('box2dStep_' + self._id, function () { self._behaviour.apply(self, arguments); });
				} else {
					this._intervalTimer = setInterval(function () { self._behaviour.apply(self, arguments); }, 1000 / 60);
				}
			}
		}
	},

	stop: function () {
		if (this._active) {
			this._active = false;

			if (this._mode === 0) {
				// Add the box2d behaviour to the ige
				ige.removeBehaviour('box2dStep_' + this._id);
			} else {
				clearInterval(this._intervalTimer);
			}
		}
	},

	/**
	 * Steps the physics simulation forward.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		var self = this,
			tempBod,
			entity,
			entityBox2dBody,
			removeWhenReady,
			count,
			destroyBody;

		if (self._active && self._world) {
			if (!self._world.IsLocked()) {
				// Remove any bodies that were queued for removal
				removeWhenReady = self._removeWhenReady;
				count = removeWhenReady.length;

				if (count) {
					destroyBody = self._world.DestroyBody;
					while (count--) {
						destroyBody.apply(self._world, [removeWhenReady[count]]);
					}
					self._removeWhenReady = [];
					removeWhenReady = null;
				}
			}

			// Call the world step; frame-rate, velocity iterations, position iterations
			if (self._mode === 0) {
				self._world.Step(ige._tickDelta / 1000, 8, 3);
			} else {
				self._world.Step(1 / 60, 8, 3);
			}

			// Loop the physics objects and move the entities they are assigned to
			tempBod = self._world.GetBodyList();
			while (tempBod) {
				if (tempBod._entity) {
					// Body has an entity assigned to it
					entity = tempBod._entity; //self.ige.entities.read(tempBod.m_userData);
					entityBox2dBody = entity._box2dBody;

					// Check if the body is awake and is dynamic (we don't transform static bodies)
					if (tempBod.IsAwake() && tempBod.m_type !== 0) {
						// Update the entity data to match the body data
						entityBox2dBody.updating = true;
						entity.translateTo(tempBod.m_xf.position.x * entity._b2dRef._scaleRatio, tempBod.m_xf.position.y * entity._b2dRef._scaleRatio, entity._translate.z);
						entity.rotateTo(entity._rotate.x, entity._rotate.y, tempBod.GetAngle());
						entityBox2dBody.updating = false;

						if (entityBox2dBody.asleep) {
							// The body was asleep last frame, fire an awake event
							entityBox2dBody.asleep = false;
							self.emit('afterAwake', entity);
						}
					} else {
						if (!entityBox2dBody.asleep) {
							// The body was awake last frame, fire an asleep event
							entityBox2dBody.asleep = true;
							self.emit('afterAsleep', entity);
						}
					}
				}

				tempBod = tempBod.GetNext();
			}

			// Clear forces because we have ended our physics simulation frame
			self._world.ClearForces();

			tempBod = null;
			entity = null;

			if (typeof(self._updateCallback) === 'function') {
				self._updateCallback();
			}
		}
	},

	destroy: function () {
		// Stop processing box2d steps
		this.removeBehaviour('box2dStep');

		// Destroy all box2d world bodies

	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeBox2dWorld; }