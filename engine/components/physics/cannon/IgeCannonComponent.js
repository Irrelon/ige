var IgeCannonComponent = IgeEventingClass.extend({
	classId: 'IgeCannonComponent',
	componentId: 'cannon',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		this._active = true;
		this._sleep = true;
		this._scaleRatio = 30;
		this._gravity = new IgePoint(0, 0, -10);
		this._broadphase = new CANNON.NaiveBroadphase();

		this._removeWhenReady = [];

		// Add the cannon behaviour to the ige
		ige.addBehaviour('cannonStep', this._behaviour);
	},

	/**
	 * Gets / sets if the world should allow sleep or not.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	sleep: function (val) {
		if (val !== undefined) {
			this._sleep = val;
			return this._entity;
		}

		return this._sleep;
	},

	/**
	 * Gets / sets the current engine to cannon scaling ratio.
	 * @param val
	 * @return {*}
	 */
	scaleRatio: function (val) {
		if (val !== undefined) {
			this._scaleRatio = val;
			return this._entity;
		}

		return this._scaleRatio;
	},

	/**
	 * Gets / sets the gravity vector.
	 * @return {*}
	 */
	gravity: function (x, y, z) {
		if (x !== undefined && y !== undefined) {
			this._gravity = new IgePoint(x, y, z);
			if (this._world) {
				this._world.gravity.set(this._gravity.x, this._gravity.y, this._gravity.z);
			}
			return this._entity;
		}

		return this._gravity;
	},

	createWorld: function () {
		this._world = new CANNON.World();
		this._world.gravity.set(this._gravity.x, this._gravity.y, this._gravity.z);
		this._world.broadphase = this._broadphase;

		return this._entity;
	},

	createPlane: function (x, y, z, sizeX, sizeY, sizeZ) {
		var normal = new CANNON.Vec3(0,0,1),
			groundShape = new CANNON.Plane(normal),
			groundBody = new CANNON.RigidBody(0, groundShape);

		groundBody.position.set(x, y, z);
		this._world.add(groundBody);
	},

	createBody: function (entity, body) {
		var tempDef = new this.b2BodyDef(),
			param,
			tempBod,
			fixtureDef,
			tempFixture,
			tempShape,
			i,
			finalX, finalY,
			finalWidth, finalHeight;

		// Process body definition and create a cannon body for it
		switch (body.type) {
			case 'static':
				tempDef.type = this.b2Body.b2_staticBody;
				break;

			case 'dynamic':
				tempDef.type = this.b2Body.b2_dynamicBody;
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
						for (i = 0; i < body.fixtures.length; i++) {
							// Grab the fixture definition
							fixtureDef = body.fixtures[i];

							// Create the fixture
							tempFixture = this.createFixture(fixtureDef);

							// Check for a shape definition for the fixture
							if (fixtureDef.shape) {
								// Create based on the shape type
								switch (fixtureDef.shape.type) {
									case 'polygon':
										tempShape = new this.b2PolygonShape();
										tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());

										tempFixture.shape = tempShape;
										tempBod.CreateFixture(tempFixture);
										break;

									case 'rectangle':
										tempShape = new this.b2PolygonShape();

										if (fixtureDef.shape.data) {
											finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
											finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
											finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._width / 2);
											finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._height / 2);
										} else {
											finalX = 0;
											finalY = 0;
											finalWidth = (entity._width / 2);
											finalHeight = (entity._height / 2);
										}

										// Set the polygon as a box
										tempShape.SetAsOrientedBox(
											(finalWidth / this._scaleRatio),
											(finalHeight / this._scaleRatio),
											new this.b2Vec2(finalX / this._scaleRatio, finalY / this._scaleRatio),
											0
										);

										tempFixture.shape = tempShape;
										tempBod.CreateFixture(tempFixture);
										break;
								}
							}
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

	enableDebug: function (canvasId) {
		// Define the debug drawing instance
		var debugDraw = new this.b2DebugDraw();
		this._cannonDebug = true;
		this._debugCanvas = document.getElementById(canvasId);
		this._debugCtx = this._debugCanvas.getContext('2d');

		debugDraw.SetSprite(this._debugCtx);
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
	},

	/** step - Step the simulation forward. {
	 category:"method",
	 } **/
	_behaviour: function (ctx) {
		var self = ige.cannon,
			tempBod,
			entity,
			entityCannonBody,
			removeWhenReady,
			count,
			destroyBody;

		if (self._active) {
			// Call the world step
			self._world.step(1 / 60);

			/*// Remove any bodies that were queued for removal
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

			// Call the world step; frame-rate, velocity iterations, position iterations
			self._world.Step(1 / 60, 8, 8);

			// Loop the physics objects and move the entities they are assigned to
			tempBod = self._world.GetBodyList();
			while (tempBod) {
				if (tempBod._entity) {
					// Body has an entity assigned to it
					entity = tempBod._entity; //self.ige.entities.read(tempBod.m_userData);
					entityCannonBody = entity._cannonBody;

					// Check if the body is awake and is dynamic (we don't transform static bodies)
					if (tempBod.IsAwake()) {
						// Update the entity data to match the body data
						entityCannonBody.updating = true;
						entity.translateTo(tempBod.m_xf.position.x * self._scaleRatio, tempBod.m_xf.position.y * self._scaleRatio, entity._translate.z);
						entity.rotateTo(entity._rotate.x, entity._rotate.y, tempBod.GetAngle());
						entityCannonBody.updating = false;

						if (entityCannonBody.asleep) {
							// The body was asleep last frame, fire an awake event
							entityCannonBody.asleep = false;
							self.emit('afterAwake', entity);
						}
					} else {
						if (!entityCannonBody.asleep) {
							// The body was awake last frame, fire an asleep event
							entityCannonBody.asleep = true;
							self.emit('afterAsleep', entity);
						}
					}
				}

				tempBod = tempBod.GetNext();
			}

			if (self._cannonDebug && this._currentCamera) {
				// Draw the debug data
				self._debugCanvas.width = ige.geometry.x;
				self._debugCanvas.height = ige.geometry.y;

				self._debugCtx.save();
				this._currentCamera._transformContext(self._debugCtx);
				self._debugCtx.translate(ige.geometry.x2, ige.geometry.y2);
				self._world.DrawDebugData();
				self._debugCtx.restore();
			}

			// Clear forces because we have ended our physics simulation frame
			self._world.ClearForces();

			tempBod = null;
			entity = null;*/

			if (typeof(self._updateCallback) === 'function') {
				self._updateCallback();
			}
		}
	}
});