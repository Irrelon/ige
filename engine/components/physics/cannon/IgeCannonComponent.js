var IgeCannonComponent = IgeEventingClass.extend({
	classId: 'IgeCannonComponent',
	componentId: 'cannon',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		this._active = true;
		this._sleep = true;
		this._scaleRatio = 1;
		this._solverIterations = 10;
		this._gravity = new CANNON.Vec3(0, 0, -60);
		this._broadphase = new CANNON.NaiveBroadphase();

		this._removeWhenReady = [];

		// Materials
		this._normalMaterial = new CANNON.Material("normalMaterial");

		// Create a slippery material (friction coefficient = 0.0)
		this._slipperyMaterial = new CANNON.Material("slipperyMaterial");

		// The ContactMaterial defines what happens when two materials meet.
		// In this case we want friction coefficient = 0.0 when the slippery material touches ground.
		this._slipperyNormalCm = new CANNON.ContactMaterial(
			this._normalMaterial,
			this._slipperyMaterial,
			0.0, // friction coefficient
			0.3  // restitution
		);

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
			this._gravity = new CANNON.Vec3(x, y, z);
			if (this._world) {
				this._world.gravity.set(this._gravity.x, this._gravity.y, this._gravity.z);
			}
			return this._entity;
		}

		return this._gravity;
	},

	solverIterations: function () {
		if (val !== undefined) {
			this._solverIterations = val;
			return this._entity;
		}

		return this._solverIterations;
	},

	createWorld: function () {
		this._world = new CANNON.World();
		this._world.gravity.set(this._gravity.x, this._gravity.y, this._gravity.z);
		this._world.broadphase = this._broadphase;
		this._world.solver.iterations = this._solverIterations;
		this._world.allowSleep = this._sleep;

		// We must add the contact materials to the world
		this._world.addContactMaterial(this._slipperyNormalCm);

		return this._entity;
	},

	createFloor: function (normalX, normalY, normalZ) {
		var groundShape = new CANNON.Plane(new CANNON.Vec3(normalX, normalY, normalZ)),
			groundBody = new CANNON.RigidBody(0, groundShape, this._slipperyMaterial);

		this._world.add(groundBody);
	},

	createBody: function (entity, body) {
		var param,
			type,
			fixtureDef,
			tempShape,
			tempBod,
			i;

		// Process body definition and create a cannon body for it
		switch (body.type) {
			case 'static':
				type = CANNON.Body.STATIC;
				break;

			case 'kinematic':
				type = CANNON.Body.KINEMATIC;
				break;

			case 'dynamic':
				type = CANNON.Body.DYNAMIC;
				break;
		}

		// Now apply any post-creation attributes we need to
		for (param in body) {
			if (body.hasOwnProperty(param)) {
				switch (param) {
					case 'fixtures':
						for (i = 0; i < body.fixtures.length; i++) {
							// Grab the fixture definition
							fixtureDef = body.fixtures[i];

							// Check for a shape definition for the fixture
							if (fixtureDef.shape) {
								// Create based on the shape type
								switch (fixtureDef.shape.type) {
									case 'box':
										if (fixtureDef.shape.data) {
											// Use defined data to create the shape
											if (fixtureDef.shape.data.sizeX !== undefined && fixtureDef.shape.data.sizeY !== undefined && fixtureDef.shape.data.sizeZ !== undefined) {
												tempShape = new CANNON.Box(new CANNON.Vec3(fixtureDef.shape.data.sizeX / this._scaleRatio, fixtureDef.shape.data.sizeY / this._scaleRatio, fixtureDef.shape.data.sizeZ / this._scaleRatio));
											} else {
												tempShape = new CANNON.Box(new CANNON.Vec3(entity._geometry.x2 + 1 / this._scaleRatio, entity._geometry.y2 / this._scaleRatio, entity._geometry.z2 / this._scaleRatio));
											}
										} else {
											tempShape = new CANNON.Box(new CANNON.Vec3(entity._geometry.x2 + 1 / this._scaleRatio, entity._geometry.y2 + 1 / this._scaleRatio, entity._geometry.z2 + 1 / this._scaleRatio));
										}
										break;
								}
							}
						}
						break;
				}
			}
		}

		tempBod = new CANNON.RigidBody(body.mass, tempShape, this._normalMaterial);
		tempBod.sleepSpeedLimit = 0.1;
		tempBod.sleepTimeLimit = 1000;

		if (body.allowSleep !== undefined) { tempBod.allowSleep = body.allowSleep; }
		if (body.sleepSpeedLimit !== undefined) { tempBod.sleepSpeedLimit = body.sleepSpeedLimit; }
		if (body.sleepTimeLimit !== undefined) { tempBod.sleepTimeLimit = body.sleepTimeLimit; }

		if (body.angularDamping !== undefined) { tempBod.angularDamping = body.angularDamping; }
		if (body.linearDamping !== undefined) { tempBod.linearDamping = body.linearDamping; }

		// Set the position
		tempBod.position.set(entity._translate.x / this._scaleRatio, entity._translate.y / this._scaleRatio, (entity._translate.z + entity._geometry.z2)  / this._scaleRatio);

		// Store the entity that is linked to this body
		tempBod._igeEntity = entity;

		// Add the body to the world
		this._world.add(tempBod);

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
			bodiesArr = self._world.bodies,
			bodyCount = bodiesArr.length,
			tempBod, entity;

		if (self._active) {
			// Call the world step
			self._world.step(1 / 60);

			while (bodyCount--) {
				tempBod = bodiesArr[bodyCount];

				// Check if the body has an IGE entity attached to it
				if (tempBod._igeEntity) {
					if (tempBod.isAwake()) {
						entity = tempBod._igeEntity;

						// Update the entity data to match the body data
						tempBod._igeUpdating = true;
						entity.translateTo(Math.ceil(tempBod.position.x * self._scaleRatio), Math.ceil(tempBod.position.y * self._scaleRatio), Math.ceil((tempBod.position.z * self._scaleRatio) - entity._geometry.z2));
						//entity.rotateTo(entity._rotate.x, entity._rotate.y, tempBod.GetAngle());
						tempBod._igeUpdating = false;
					}
				}
			}

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
				self._debugCanvas.width = ige._geometry.x;
				self._debugCanvas.height = ige._geometry.y;

				self._debugCtx.save();
				this._currentCamera._transformContext(self._debugCtx);
				self._debugCtx.translate(ige._geometry.x2, ige._geometry.y2);
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