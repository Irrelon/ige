import { ige } from "../../../instance";
import { IgeEntity } from "../../../core/IgeEntity";
import type { IgeBox2dComponent } from "./IgeBox2dComponent";
import type { IgeBox2dBodyDef } from "@/types/IgeBox2dBodyDef";

/**
 * Creates a new entity with box2d integration.
 */
export class IgeEntityBox2d extends IgeEntity {
	classId = 'IgeEntityBox2d';

	_b2dRef: IgeBox2dComponent;
	_box2dBodyDef?: IgeBox2dBodyDef;
	_box2dBody?: Box2D.Dynamics.b2Body;

	constructor () {
		super();

		this._b2dRef = (ige.engine.components.box2d as IgeBox2dComponent);

		// Check if Box2D is enabled in the engine
		if (this._b2dRef) {
			if (this._b2dRef._networkDebugMode) {
				this._translateToProto = function () {};
				this._translateByProto = function () {};

				this._rotateToProto = function () {};
				this._rotateByProto = function () {};

				this._updateProto = this.update;

				// Make sure box2d is kept up to date by the engine
				this.update = this._update;
			} else {
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
			}
		}
	}

	/**
	 * Gets / sets the box2d body's active flag which determines
	 * if it will be included as part of the physics simulation
	 * or not.
	 * @param {Boolean=} val Set to true to include the body in
	 * the physics simulation or false for it to be ignored.
	 * @return {*}
	 */
	box2dActive (val?: boolean) {
		if (this._box2dBody) {
			if (val !== undefined) {
				this._box2dBody.SetActive(val);
				return this;
			}

			return this._box2dBody.IsActive();
		}

		return this;
	}

	/**
	 * Gets / sets the physics body definition. When setting the
	 * definition the physics body will also be created automatically
	 * from the supplied definition.
	 * @param def
	 * @return {*}
	 */
	box2dBody (def: IgeBox2dBodyDef): this;
	box2dBody (): IgeBox2dBodyDef;
	box2dBody (def?: IgeBox2dBodyDef) {
		if (def !== undefined) {
			this._box2dBodyDef = def;

			// Check that the Box2D component exists
			if (this._b2dRef) {
				// Ask the Box2D component to create a new body for us
				this._box2dBody = this._b2dRef.createBody(this, def);
			} else {
				this.log('You are trying to create a Box2D entity but you have not added the Box2D component to the ige instance!', 'error');
			}

			return this;
		}

		return this._box2dBodyDef;
	}

	/**
	 * Gets / sets the Box2D body's gravitic value. If set to false,
	 * this entity will not be affected by gravity. If set to true it
	 * will be affected by gravity.
	 * @param {Boolean=} val True to allow gravity to affect this entity.
	 * @returns {*}
	 */
	gravitic (val?: boolean) {
		if (this._box2dBody) {
			if (val !== undefined) {
				this._box2dBody.m_nonGravitic = !val;

				if (this._box2dBodyDef) {
					this._box2dBodyDef.gravitic = val;
				}

				// Wake up the body
				this._box2dBody.SetAwake(true);
				return this;
			}

			return !this._box2dBody.m_nonGravitic;
		}
	}

	on () {
		if (arguments.length === 3) {
			let evName = arguments[0],
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
	}

	off () {
		if (arguments.length === 3) {

		} else {
			IgeEntity.prototype.off.apply(this, arguments);
		}
	}

	_setupContactListeners () {
		const self = this;

		this._b2dRef.contactListener(
			// Listen for when contact's begin
			function (contact) {
				//console.log('Contact begins between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);

				// Loop the collision listeners and check for a match
				const arr = self._collisionStartListeners;

				if (arr) {
					self._checkContact(contact, arr);
				}
			},
			// Listen for when contact's end
			function (contact) {
				//console.log('Contact ends between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);
				// Loop the collision listeners and check for a match
				const arr = self._collisionEndListeners;

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

				// You can also check an entity by its category using igeEitherCategory('categoryName')
			}*/
		);
	}

	_checkContact (contact, arr) {
		let self = this,
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
	}

	/**
	 * Takes over translateTo calls and processes Box2D movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_translateTo (x, y, z) {
		const entBox2d = this._box2dBody;

		// Call the original method
		this._translateToProto(x, y, z);

		// Check if the entity has a Box2D body attached
		// and if so, is it updating or not
		if (entBox2d && !entBox2d.updating) {
			// We have an entity with a Box2D definition that is
			// not currently updating so let's override the standard
			// transform op and take over

			// Translate the body
			entBox2d.SetPosition({x: x / this._b2dRef._scaleRatio, y: y / this._b2dRef._scaleRatio});
			entBox2d.SetAwake(true);
		}

		return this;
	}

	/**
	 * Takes over translateBy calls and processes Box2D movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_translateBy (x, y, z) {
		this._translateTo(this._translate.x + x, this._translate.y + y, this._translate.z + z);
	}

	/**
	 * Takes over translateTo calls and processes Box2D movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_rotateTo (x, y, z) {
		const entBox2d = this._box2dBody;

		// Call the original method
		this._rotateToProto(x, y, z);

		// Check if the entity has a Box2D body attached
		// and if so, is it updating or not
		if (entBox2d && !entBox2d.updating) {
			// We have an entity with a Box2D definition that is
			// not currently updating so let's override the standard
			// transform op and take over

			// Translate the body
			entBox2d.SetAngle(z);
			entBox2d.SetAwake(true);
		}

		return this;
	}

	/**
	 * Takes over translateBy calls and processes Box2D movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_rotateBy (x, y, z) {
		this._rotateTo(this._rotate.x + x, this._rotate.y + y, this._rotate.z + z);
	}

	/**
	 * Purely for networkDebugMode handling, ensures that an entity's transform is
	 * not taken over by the physics simulation and is instead handled by the engine.
	 * @param ctx
	 * @private
	 */
	_update (ctx) {
		// Call the original method
		this._updateProto(ctx);

		// Update the Box2D body transform
		this._translateTo(this._translate.x, this._translate.y, this._translate.z);
		this._rotateTo(this._rotate.x, this._rotate.y, this._rotate.z);

		//IgeEntity.prototype.update.call(this, ctx);
	}

	/**
	 * If true, disabled Box2D debug shape drawing for this entity.
	 * @param {Boolean} val
	 */
	box2dNoDebug (val) {
		if (val !== undefined) {
			this._box2dNoDebug = val;
			return this;
		}

		return this._box2dNoDebug;
	}

	/**
	 * Destroys the physics entity and the Box2D body that
	 * is attached to it.
	 */
	destroy () {
		if (this._box2dBody) {
			this._b2dRef.destroyBody(this._box2dBody);
		}

		return super.destroy();
	}
}
