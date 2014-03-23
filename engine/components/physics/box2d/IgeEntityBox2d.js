/**
 * Creates a new entity with box2d integration.
 */
var IgeEntityBox2d = IgeEntity.extend({
	classId: 'IgeEntityBox2d',

	init: function (world) {
		IgeEntity.prototype.init.call(this);
		
		if (world) {
			if (typeof(world) === 'string') {
				// Get world reference
				world = ige.box2d.world(world);
			}
			
			this._box2dWorld = world;
			this._b2dRef = world;
		} else {
			this._b2dRef = ige.box2d;
		}
		
		// Check if box2d is enabled in the engine
		if (ige.box2d) {
			if (!this._b2dRef._networkDebugMode) {
				// Store the existing transform methods
				this._translateToProto = this.translateTo;
				this._translateByProto = this.translateBy;
		
				this._rotateToProto = this.rotateTo;
				this._rotateByProto = this.rotateBy;
		
				// Take over the transform methods
				this.translateTo = this._translateTo;
				this.translateBy = this._translateBy;
		
				this.rotateTo = this._rotateTo;
				this.rotateBy = this._rotateBy;
			} else {
				this._translateToProto = function () {};
				this._translateByProto = function () {};
		
				this._rotateToProto = function () {};
				this._rotateByProto = function () {};
				
				this._updateProto = this.update;
				
				// Make sure box2d is kept up to date by the engine
				this.update = this._update;
			}
		}
	},

	/**
	 * Gets / sets the box2d body's active flag which determines
	 * if it will be included as part of the physics simulation
	 * or not.
	 * @param {Boolean=} val Set to true to include the body in
	 * the physics simulation or false for it to be ignored.
	 * @return {*}
	 */
	box2dActive: function (val) {
		if (this._box2dBody) {
			if (val !== undefined) {
				this._box2dBody.SetActive(val);
				return this;
			}

			return this._box2dBody.IsActive();
		}

		return this;
	},

	/**
	 * Gets / sets the physics body definition. When setting the
	 * definition the physics body will also be created automatically
	 * from the supplied definition.
	 * @param def
	 * @return {*}
	 */
	box2dBody: function (def) {
		if (def !== undefined) {
			this._box2dBodyDef = def;

			// Check that the box2d component exists
			if (ige.box2d) {
				// Ask the box2d component to create a new body for us
				this._box2dBody = this._b2dRef.createBody(this, def);
			} else {
				this.log('You are trying to create a box2d entity but you have not added the box2d component to the ige instance!', 'error');
			}

			return this;
		}

		return this._box2dBodyDef;
	},

	/**
	 * Gets / sets the box2d body's gravitic value. If set to false,
	 * this entity will not be affected by gravity. If set to true it
	 * will be affected by gravity.
	 * @param {Boolean=} val True to allow gravity to affect this entity.
	 * @returns {*}
	 */
	gravitic: function (val) {
		if (this._box2dBody) {
			if (val !== undefined) {
				this._box2dBody.m_nonGravitic = !val;
				this._box2dBodyDef.gravitic = val;
				
				// Wake up the body
				this._box2dBody.SetAwake(true);
				return this;
			}
			
			return !this._box2dBody.m_nonGravitic;
		}
	},
	
	on: function () {
		if (arguments.length === 3) {
			var evName = arguments[0],
				target = arguments[1],
				callback = arguments[2],
				type;

			switch (target.substr(0, 1)) {
				case '#':
					type = 0;
					break;

				case '.':
					type = 1;
					break;
			}

			target = target.substr(1, target.length - 1);
			
			switch (evName) {
				case 'collisionStart':
					this._collisionStartListeners = this._collisionStartListeners || [];
					this._collisionStartListeners.push({
						type: type,
						target: target,
						callback: callback
					});
					
					if (!this._contactListener) {
						// Setup contact listener
						this._contactListener = this._setupContactListeners();
					}
					break;
				
				case 'collisionEnd':
					this._collisionEndListeners = this._collisionEndListeners || [];
					this._collisionEndListeners.push({
						type: type,
						target: target,
						callback: callback
					});
					
					if (!this._contactListener) {
						// Setup contact listener
						this._contactListener = this._setupContactListeners();
					}
					break;
				
				default:
					this.log('Cannot add event listener, event type ' + evName + ' not recognised', 'error');
					break;
			}
		} else {
			IgeEntity.prototype.on.apply(this, arguments);
		}
	},
	
	off: function () {
		if (arguments.length === 3) {
			
		} else {
			IgeEntity.prototype.off.apply(this, arguments);
		}
	},
	
	_setupContactListeners: function () {
		var self = this;
		
		ige.box2d.contactListener(
			// Listen for when contact's begin
			function (contact) {
				//console.log('Contact begins between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);
				
				// Loop the collision listeners and check for a match
				var arr = self._collisionStartListeners;
				
				if (arr) {
					self._checkContact(contact, arr);
				}
			},
			// Listen for when contact's end
			function (contact) {
				//console.log('Contact ends between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);
				// Loop the collision listeners and check for a match
				var arr = self._collisionEndListeners;
				
				if (arr) {
					self._checkContact(contact, arr);
				}
			}/*,
			// Handle pre-solver events
			function (contact) {
				// If player ship collides with lunar surface, crash!
				if (contact.igeEitherCategory('orb') && contact.igeEitherCategory('ship')) {
					// Cancel the contact
					contact.SetEnabled(false);
				}

				// You can also check an entity by it's category using igeEitherCategory('categoryName')
			}*/
		);
	},
	
	_checkContact: function (contact, arr) {
		var self = this,
			arrCount = arr.length,
			otherEntity,
			listener,
			i;
					
		if (contact.igeEntityA()._id === self._id) {
			otherEntity = contact.igeEntityB();
		} else if (contact.igeEntityB()._id === self._id) {
			otherEntity = contact.igeEntityA();
		} else {
			// This contact has nothing to do with us
			return;
		}
		
		for (i = 0; i < arrCount; i++) {
			listener = arr[i];
			
			if (listener.type === 0) {
				// Listener target is an id
				if (otherEntity._id === listener.target) {
					// Contact with target established, fire callback
					listener.callback(contact);
				}
			}
			
			if (arr[i].type === 1) {
				// Listener target is a category
				if (otherEntity._category === listener.target) {
					// Contact with target established, fire callback
					listener.callback(contact);
				}
			}
		}
	},

	/**
	 * Takes over translateTo calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_translateTo: function (x, y, z) {
		var entBox2d = this._box2dBody;

		// Call the original method
		this._translateToProto(x, y, z);

		// Check if the entity has a box2d body attached
		// and if so, is it updating or not
		if (entBox2d && !entBox2d.updating) {
			// We have an entity with a box2d definition that is
			// not currently updating so let's override the standard
			// transform op and take over

			// Translate the body
			entBox2d.SetPosition({x: x / this._b2dRef._scaleRatio, y: y / this._b2dRef._scaleRatio});
			entBox2d.SetAwake(true);
		}

		return this;
	},

	/**
	 * Takes over translateBy calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_translateBy: function (x, y, z) {
		this._translateTo(this._translate.x + x, this._translate.y + y, this._translate.z + z);
	},

	/**
	 * Takes over translateTo calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_rotateTo: function (x, y, z) {
		var entBox2d = this._box2dBody;

		// Call the original method
		this._rotateToProto(x, y, z);

		// Check if the entity has a box2d body attached
		// and if so, is it updating or not
		if (entBox2d && !entBox2d.updating) {
			// We have an entity with a box2d definition that is
			// not currently updating so let's override the standard
			// transform op and take over

			// Translate the body
			entBox2d.SetAngle(z);
			entBox2d.SetAwake(true);
		}

		return this;
	},

	/**
	 * Takes over translateBy calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_rotateBy: function (x, y, z) {
		this._rotateTo(this._rotate.x + x, this._rotate.y + y, this._rotate.z + z);
	},

	/**
	 * Purely for networkDebugMode handling, ensures that an entity's transform is
	 * not taken over by the physics simulation and is instead handled by the engine.
	 * @param ctx
	 * @private
	 */
	_update: function (ctx) {
		// Call the original method
		this._updateProto(ctx);
		
		// Update the box2d body transform
		this._translateTo(this._translate.x, this._translate.y, this._translate.z);
		this._rotateTo(this._rotate.x, this._rotate.y, this._rotate.z);
		
		//IgeEntity.prototype.update.call(this, ctx);
	},

	/**
	 * If true, disabled box2d debug shape drawing for this entity.
	 * @param {Boolean} val
	 */
	box2dNoDebug: function (val) {
		if (val !== undefined) {
			this._box2dNoDebug = val;
			return this;
		}
		
		return this._box2dNoDebug;
	},

	/**
	 * Destroys the physics entity and the box2d body that
	 * is attached to it.
	 */
	destroy: function () {
		if (this._box2dBody) {
			this._b2dRef.destroyBody(this._box2dBody);
		}
		IgeEntity.prototype.destroy.call(this);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntityBox2d; }