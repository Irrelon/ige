import { ige } from "../../../instance";
import { IgeEntity } from "../../../core/IgeEntity";
import { Box2D } from "@/engine/components/physics/box2d/lib_box2d";
/**
 * Creates a new entity with Box2D integration.
 */
export class IgeEntityBox2d extends IgeEntity {
    classId = "IgeEntityBox2d";
    _b2dRef;
    _box2dBodyDef;
    _box2dBody;
    _box2dOurContactFixture;
    _box2dTheirContactFixture;
    _box2dNoDebug = false;
    _collisionStartListeners;
    _collisionEndListeners;
    _contactListener;
    constructor() {
        super();
        this._b2dRef = ige.box2d;
    }
    /**
     * Gets / sets the Box2D body's active flag which determines
     * if it will be included as part of the physics simulation
     * or not.
     * @param {boolean=} val Set to true to include the body in
     * the physics simulation or false for it to be ignored.
     * @return {*}
     */
    box2dActive(val) {
        if (this._box2dBody) {
            if (val !== undefined) {
                this._box2dBody.SetActive(val);
                return this;
            }
            return this._box2dBody.IsActive();
        }
        return this;
    }
    box2dBody(def) {
        if (def !== undefined) {
            this._box2dBodyDef = def;
            // Check that the Box2D component exists
            if (this._b2dRef) {
                // Ask the Box2D component to create a new body for us
                this._box2dBody = this._b2dRef.createBody(this, def);
            }
            else {
                this.log("You are trying to create a Box2D entity but you have not added the Box2D component to the ige instance!", "error");
            }
            return this;
        }
        return this._box2dBodyDef;
    }
    /**
     * Gets / sets the Box2D body's gravitic value. If set to false,
     * this entity will not be affected by gravity. If set to true it
     * will be affected by gravity.
     * @param {boolean=} val True to allow gravity to affect this entity.
     * @returns {*}
     */
    gravitic(val) {
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
    on(eventName, ...rest) {
        if (rest[1]) {
            const listener = rest[1];
            let id = rest[0], type = 0;
            switch (id.substr(0, 1)) {
                case "#":
                    type = 0;
                    break;
                case ".":
                    type = 1;
                    break;
            }
            id = id.substr(1, id.length - 1);
            switch (eventName) {
                case "collisionStart":
                    this._collisionStartListeners = this._collisionStartListeners || [];
                    this._collisionStartListeners.push({
                        type: type,
                        target: id,
                        callback: listener
                    });
                    if (!this._contactListener) {
                        // Setup contact listener
                        this._contactListener = this._setupContactListeners();
                    }
                    break;
                case "collisionEnd":
                    this._collisionEndListeners = this._collisionEndListeners || [];
                    this._collisionEndListeners.push({
                        type: type,
                        target: id,
                        callback: listener
                    });
                    if (!this._contactListener) {
                        // Setup contact listener
                        this._contactListener = this._setupContactListeners();
                    }
                    break;
                default:
                    this.log("Cannot add event listener, event type " + eventName + " not recognised", "error");
                    break;
            }
            return this;
        }
        // @ts-ignore
        return super.on(eventName, ...rest);
    }
    off(eventName, ...args) {
        if (args[1]) {
            return;
        }
        return super.off(eventName, ...args);
    }
    _setupContactListeners() {
        return this._b2dRef.contactListener(
        // Listen for when contact's begin
        (contact) => {
            //console.log('Contact begins between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);
            // Loop the collision listeners and check for a match
            const arr = this._collisionStartListeners;
            if (arr) {
                this._checkContact(contact, arr);
            }
        }, 
        // Listen for when contact's end
        (contact) => {
            //console.log('Contact ends between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);
            // Loop the collision listeners and check for a match
            const arr = this._collisionEndListeners;
            if (arr) {
                this._checkContact(contact, arr);
            }
        } /*,
        // Handle pre-solver events
        (contact) => {
            // If player ship collides with lunar surface, crash!
            if (contact.igeEitherCategory('orb') && contact.igeEitherCategory('ship')) {
                // Cancel the contact
                contact.SetEnabled(false);
            }

            // You can also check an entity by its category using igeEitherCategory('categoryName')
        }*/);
    }
    _checkContact(contact, arr) {
        const arrCount = arr.length;
        let otherEntity;
        if (contact.igeEntityA()._id === this._id) {
            otherEntity = contact.igeEntityB();
        }
        else if (contact.igeEntityB()._id === this._id) {
            otherEntity = contact.igeEntityA();
        }
        else {
            // This contact has nothing to do with us
            return;
        }
        for (let i = 0; i < arrCount; i++) {
            const listener = arr[i];
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
    translateTo(x, y, z) {
        const entBox2d = this._box2dBody;
        // Call the original method
        super.translateTo(x, y, z);
        // Check if the entity has a Box2D body attached
        // and if so, is it updating or not
        if (entBox2d && !entBox2d.updating) {
            // We have an entity with a Box2D definition that is
            // not currently updating so let's override the standard
            // transform op and take over
            // Translate the body
            entBox2d.SetPosition(new Box2D.Common.Math.b2Vec2(x / this._b2dRef._scaleRatio, y / this._b2dRef._scaleRatio));
            entBox2d.SetAwake(true);
        }
        return this;
    }
    /**
     * Takes over translateTo calls and processes Box2D movement as well.
     * @param x
     * @param y
     * @param z
     * @return {*}
     * @private
     */
    rotateTo(x, y, z) {
        const entBox2d = this._box2dBody;
        // Call the original method
        super.rotateTo(x, y, z);
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
     * Processes the updates required each render frame. Any code in the update()
     * method will be called ONCE for each render frame BEFORE the tick() method.
     * This differs from the tick() method in that the tick method can be called
     * multiple times during a render frame depending on how many viewports your
     * simulation is being rendered to, whereas the update() method is only called
     * once. It is therefore the perfect place to put code that will control your
     * entity's motion, AI etc.
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     * @param {number} tickDelta The delta between the last tick time and this one.
     */
    update(ctx, tickDelta) {
        // Call the original method
        super.update(ctx, tickDelta);
        if (this._b2dRef._networkDebugMode) {
            // Update the Box2D body transform
            this.translateTo(this._translate.x, this._translate.y, this._translate.z);
            this.rotateTo(this._rotate.x, this._rotate.y, this._rotate.z);
        }
    }
    /**
     * If true, disabled Box2D debug shape drawing for this entity.
     * @param {boolean} val
     */
    box2dNoDebug(val) {
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
    destroy() {
        if (this._box2dBody) {
            this._b2dRef.destroyBody(this._box2dBody);
        }
        return super.destroy();
    }
}
