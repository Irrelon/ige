import { IgeEntityBox2d } from "../../../../export/exports.js"
import { b2CircleShape } from "../../../../export/exports.js"
import { b2PolygonShape } from "../../../../export/exports.js"
import { b2Filter } from "../../../../export/exports.js"
import { b2FixtureDef } from "../../../../export/exports.js"
import { b2ContactListener } from "../../../../export/exports.js"
import { IgeEventingClass } from "../../../../export/exports.js"
import { ige } from "../../../../export/exports.js"
import { b2Vec2 } from "../../../../export/exports.js"
import { b2BodyDef, b2BodyType } from "../../../../export/exports.js"
import { b2World } from "../../../../export/exports.js"
import { IgeBehaviourType } from "../../../../export/exports.js"
import { IgeBox2dBodyType } from "../../../../export/exports.js"
import { IgeBox2dFixtureShapeType } from "../../../../export/exports.js"
import { IgeBox2dTimingMode } from "../../../../export/exports.js"
/**
 * The engine's Box2D component class.
 */
export class IgeBox2dController extends IgeEventingClass {
    classId = "IgeBox2dController";
    componentId = "box2d";
    _intervalTimer;
    _active = false;
    _renderMode = IgeBox2dTimingMode.matchEngine;
    _useWorker = false;
    _sleep = true;
    _scaleRatio = 1;
    _gravity;
    _removeWhenReady;
    _networkDebugMode = false;
    _box2dDebug = false;
    _updateCallback;
    _world;
    constructor() {
        super();
        this._renderMode = IgeBox2dTimingMode.matchEngine;
        this._sleep = true;
        this._scaleRatio = 30;
        this._gravity = new b2Vec2(0, 0);
        this._removeWhenReady = [];
    }
    /**
     * Starts the physics simulation. Without calling this, no physics operations will be processed.
     */
    start() {
        if (!this._world) {
            throw new Error("Cannot start the physics simulation until a world exists. Use the createWorld() method to set up a physics world before calling start()!");
        }
        if (this._active) {
            return;
        }
        this._active = true;
        if (this._networkDebugMode) {
            return;
        }
        // Add the box2D behaviour to the engine
        if (this._renderMode === IgeBox2dTimingMode.matchEngine) {
            ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "box2dStep", this._behaviour);
        }
        else {
            this._intervalTimer = setInterval(this._behaviour, 1000 / 60);
        }
    }
    /**
     * Stops the physics simulation. You can start it again and resume where it left off by calling start().
     */
    stop() {
        if (!this._active) {
            return;
        }
        this._active = false;
        // Remove the box2D behaviour from the engine
        if (this._renderMode === IgeBox2dTimingMode.matchEngine) {
            ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "box2dStep");
        }
        else {
            clearInterval(this._intervalTimer);
        }
    }
    useWorker(val) {
        if (typeof Worker !== "undefined") {
            if (val !== undefined) {
                this._useWorker = val;
                return this;
            }
            return this._useWorker;
        }
        else {
            this.log("Web workers were not detected on this browser. Cannot access useWorker() method.", "warning");
        }
    }
    /**
     * Gets / sets the world interval mode. In mode 0 (zero) the
     * box2D simulation is synced to the framerate of the engine's
     * renderer. In mode 1 the box2D simulation is stepped at a constant
     * speed regardless of the engine's renderer. This must be set *before*
     * calling the start() method in order for the setting to take effect.
     * @param {Integer} val The mode, either 0 or 1.
     * @returns {*}
     */
    mode(val) {
        if (val !== undefined) {
            this._renderMode = val;
            return this;
        }
        return this._renderMode;
    }
    sleep(val) {
        if (val !== undefined) {
            this._sleep = val;
            return this;
        }
        return this._sleep;
    }
    /**
     * Gets / sets the current engine-to-box2D scaling ratio.
     * @param val
     * @return {*}
     */
    scaleRatio(val) {
        if (val !== undefined) {
            this._scaleRatio = val;
            return this;
        }
        return this._scaleRatio;
    }
    gravity(x, y) {
        if (x !== undefined && y !== undefined) {
            this._gravity = new b2Vec2(x, y);
            return this;
        }
        return this._gravity;
    }
    /**
     * Gets the current Box2D world object.
     * @return {b2World}
     */
    world() {
        return this._world;
    }
    /**
     * Creates the Box2D world.
     * @return {*}
     */
    createWorld() {
        this._world = new b2World(this._gravity);
        this.log("World created");
        return this;
    }
    /**
     * Creates a Box2D fixture and returns it.
     * @param params
     * @return {b2FixtureDef}
     */
    createFixture(params) {
        const tempDef = new b2FixtureDef();
        for (const param in params) {
            if (param !== "shape" && param !== "filter") {
                tempDef[param] = params[param];
            }
        }
        return tempDef;
    }
    /**
     * Creates a Box2D body and attaches it to an IGE entity
     * based on the supplied body definition.
     * @param {IgeEntity} entity
     * @param {Object} body
     * @return {b2Body}
     */
    createBody(entity, body) {
        if (!this._world) {
            throw new Error("No box2D world instantiated!");
        }
        const tempDef = new b2BodyDef();
        let param, fixtureDef, tempFixture, finalFixture, tempShape, tempFilterData, i, finalX, finalY, finalWidth, finalHeight;
        // Process body definition and create a box2D body for it
        switch (body.type) {
            case IgeBox2dBodyType.static: // "static"
                tempDef.type = b2BodyType.b2_staticBody;
                break;
            case IgeBox2dBodyType.dynamic: // "dynamic"
                tempDef.type = b2BodyType.b2_dynamicBody;
                break;
            case IgeBox2dBodyType.kinematic: // "kinematic"
                tempDef.type = b2BodyType.b2_kinematicBody;
                break;
        }
        // Add the parameters of the body to the new body instance
        for (param in body) {
            switch (param) {
                case "type":
                case "gravitic":
                case "fixedRotation":
                case "fixtures":
                    // Ignore these for now, we process them
                    // below as post-creation attributes
                    break;
                default:
                    // @ts-ignore
                    tempDef[param] = body[param];
                    break;
            }
        }
        // Set the position
        tempDef.position.Set(entity._translate.x / this._scaleRatio, entity._translate.y / this._scaleRatio);
        // Create the new body
        const tempBod = this._world.CreateBody(tempDef);
        // Now apply any post-creation attributes we need to
        for (param in body) {
            switch (param) {
                case "gravitic":
                    // TODO: Modify box2d to allow gravitic mode again
                    // if (!body.gravitic) {
                    // 	tempBod.m_nonGravitic = true;
                    // }
                    break;
                case "fixedRotation":
                    if (body.fixedRotation) {
                        tempBod.SetFixedRotation(true);
                    }
                    break;
                case "fixtures":
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
                                    case IgeBox2dFixtureShapeType.circle:
                                        tempShape = new b2CircleShape();
                                        if (fixtureDef.shape.data &&
                                            typeof fixtureDef.shape.data.radius !== "undefined") {
                                            tempShape.SetRadius(fixtureDef.shape.data.radius / this._scaleRatio);
                                        }
                                        else {
                                            tempShape.SetRadius(entity._bounds2d.x / this._scaleRatio / 2);
                                        }
                                        if (fixtureDef.shape.data) {
                                            finalX =
                                                fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
                                            finalY =
                                                fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
                                            tempShape.SetLocalPosition(new b2Vec2(finalX / this._scaleRatio, finalY / this._scaleRatio));
                                        }
                                        break;
                                    case IgeBox2dFixtureShapeType.polygon:
                                        tempShape = new b2PolygonShape();
                                        tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
                                        break;
                                    case IgeBox2dFixtureShapeType.rectangle:
                                        tempShape = new b2PolygonShape();
                                        if (fixtureDef.shape.data) {
                                            finalX =
                                                fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
                                            finalY =
                                                fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
                                            finalWidth =
                                                fixtureDef.shape.data.width !== undefined
                                                    ? fixtureDef.shape.data.width
                                                    : entity._bounds2d.x / 2;
                                            finalHeight =
                                                fixtureDef.shape.data.height !== undefined
                                                    ? fixtureDef.shape.data.height
                                                    : entity._bounds2d.y / 2;
                                        }
                                        else {
                                            finalX = 0;
                                            finalY = 0;
                                            finalWidth = entity._bounds2d.x / 2;
                                            finalHeight = entity._bounds2d.y / 2;
                                        }
                                        // Set the polygon as a box
                                        tempShape.SetAsOrientedBox(finalWidth / this._scaleRatio, finalHeight / this._scaleRatio, new b2Vec2(finalX / this._scaleRatio, finalY / this._scaleRatio), 0);
                                        break;
                                }
                                if (tempShape) {
                                    tempFixture.shape = tempShape;
                                    finalFixture = tempBod.CreateFixture(tempFixture);
                                    // @ts-ignore
                                    finalFixture.igeId = tempFixture.igeId;
                                }
                            }
                            if (fixtureDef.filter && finalFixture) {
                                tempFilterData = new b2Filter();
                                if (fixtureDef.filter.categoryBits !== undefined) {
                                    tempFilterData.categoryBits = fixtureDef.filter.categoryBits;
                                }
                                if (fixtureDef.filter.maskBits !== undefined) {
                                    tempFilterData.maskBits = fixtureDef.filter.maskBits;
                                }
                                if (fixtureDef.filter.categoryIndex !== undefined) {
                                    tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex;
                                }
                                finalFixture.SetFilterData(tempFilterData);
                            }
                            if (fixtureDef.density !== undefined && finalFixture) {
                                finalFixture.SetDensity(fixtureDef.density);
                            }
                        }
                    }
                    else {
                        this.log("Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.", "warning");
                    }
                    break;
            }
        }
        // Store the entity that is linked to this body
        tempBod.SetUserData({ _entity: entity });
        // Add the body to the world with the passed fixture
        return tempBod;
    }
    /**
     * Produces static box2D bodies from passed map data.
     * @param {IgeTileMap2d} mapLayer
     * @param {Function=} callback Returns true or false depending
     * on if the passed map data should be included as part of the
     * box2D static object data. This allows you to control what
     * parts of the map data are to be considered for box2D static
     * objects and which parts are to be ignored. If not passed then
     * any tile with any map data is considered part of the static
     * object data.
     */
    staticsFromMap(mapLayer, callback) {
        if (mapLayer.map) {
            const tileWidth = mapLayer.tileWidth();
            const tileHeight = mapLayer.tileHeight();
            // Get the array of rectangle bounds based on
            // the map's data
            const rectArray = mapLayer.scanRects(callback);
            let rectCount = rectArray.length;
            while (rectCount--) {
                const rect = rectArray[rectCount];
                const posX = tileWidth * (rect.width / 2);
                const posY = tileHeight * (rect.height / 2);
                new IgeEntityBox2d()
                    .translateTo(rect.x * tileWidth + posX, rect.y * tileHeight + posY, 0)
                    .width(rect.width * tileWidth)
                    .height(rect.height * tileHeight)
                    .drawBounds(true)
                    .drawBoundsData(false)
                    .box2dBody({
                    type: IgeBox2dBodyType.static,
                    allowSleep: true,
                    fixtures: [
                        {
                            shape: {
                                type: IgeBox2dFixtureShapeType.rectangle
                            }
                        }
                    ]
                });
            }
        }
        else {
            this.log("Cannot extract box2D static bodies from map data because passed map does not have a .map property!", "error");
        }
    }
    /**
     * Creates a contact listener with the specified callbacks. When
     * contacts begin and end inside the box2D simulation the specified
     * callbacks are fired.
     * @param {Function} beginContactCallback The method to call when the contact listener detects contact has started.
     * @param {Function} endContactCallback The method to call when the contact listener detects contact has ended.
     * @param {Function} preSolve
     * @param {Function} postSolve
     */
    contactListener(beginContactCallback, endContactCallback, preSolve, postSolve) {
        if (!this._world) {
            throw new Error("No box2D world instantiated!");
        }
        const contactListener = new b2ContactListener();
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
        return contactListener;
    }
    /**
     * If enabled, sets the physics world into network debug mode which
     * will stop the world from generating collisions but still allow us
     * to see shape outlines as they are attached to bodies. Useful when
     * your physics system is server-side but seeing client-side shape
     * data is useful for debugging collisions.
     * @param {boolean} val
     */
    networkDebugMode(val) {
        if (val !== undefined) {
            this._networkDebugMode = val;
            if (val) {
                // We are enabled so disable all physics contacts
                this.contactListener(
                // Begin contact
                function (contact) { }, 
                // End contact
                function (contact) { }, 
                // Pre-solve
                function (contact) {
                    // Cancel the contact
                    contact.SetEnabled(false);
                }, 
                // Post-solve
                function (contact) { });
            }
            else {
                // Re-enable contacts
                this.contactListener();
            }
            return this;
        }
        return this._networkDebugMode;
    }
    /**
     * Creates a debug entity that outputs the bounds of each box2D
     * body during standard engine ticks.
     * @param {IgeEntity} mountScene
     */
    enableDebug(mountScene) {
        // TODO: Implement debug drawing again. Look at the Box2d library in ./testbed for an example of the class
        // if (!this._world) {
        // 	throw new Error("No box2D world instantiated!");
        // }
        //
        // if (mountScene) {
        // 	// Define the debug drawing instance
        // 	const debugDraw = new igeBox2dDebugDraw();
        // 	this._box2dDebug = true;
        //
        // 	debugDraw.SetSprite(ige.engine._ctx as CanvasRenderingContext2D);
        // 	debugDraw.SetDrawScale(this._scaleRatio);
        // 	debugDraw.SetFillAlpha(0.3);
        // 	debugDraw.SetLineThickness(1.0);
        // 	debugDraw.SetFlags(
        // 		b2DrawFlags.e_controllerBit | b2DrawFlags.e_jointBit | b2DrawFlags.e_pairBit | b2DrawFlags.e_shapeBit
        // 		//| b2DrawFlags.e_aabbBit
        // 		//| b2DrawFlags.e_centerOfMassBit
        // 	);
        //
        // 	// Set the debug draw for the world
        // 	this._world.SetDebugDraw(debugDraw);
        //
        // 	// Create the debug painter entity and mount
        // 	// it to the passed scene
        // 	new IgeBox2dDebugPainter(ige.engine)
        // 		.depth(40000) // Set a really high depth
        // 		.drawBounds(false)
        // 		.mount(mountScene);
        // } else {
        // 	this.log(
        // 		"Cannot enable box2D debug drawing because the passed argument is not an object on the scenegraph.",
        // 		"error"
        // 	);
        // }
    }
    /**
     * Queues a body for removal from the physics world.
     * @param body
     */
    destroyBody(body) {
        this._removeWhenReady.push(body);
    }
    /**
     * Gets / sets the callback method that will be called after
     * every physics world step.
     * @param method
     * @return {*}
     */
    updateCallback(method) {
        if (method !== undefined) {
            this._updateCallback = method;
            return this;
        }
        return this._updateCallback;
    }
    /**
     * Steps the physics simulation forward.
     * @private
     */
    _behaviour = () => {
        if (!this._world) {
            throw new Error("No box2D world instantiated!");
        }
        let tempBod;
        let entity;
        let entityBox2dBody;
        let removeWhenReady;
        let count;
        let destroyBody;
        if (this._active && this._world) {
            if (!this._world.IsLocked()) {
                // Remove any bodies that were queued for removal
                removeWhenReady = this._removeWhenReady;
                count = removeWhenReady.length;
                if (count) {
                    destroyBody = this._world.DestroyBody;
                    while (count--) {
                        destroyBody.apply(this._world, [removeWhenReady[count]]);
                    }
                    this._removeWhenReady = [];
                    removeWhenReady = null;
                }
            }
            // Call the world step; frame-rate, velocity iterations, position iterations
            if (this._renderMode === IgeBox2dTimingMode.matchEngine) {
                this._world.Step(ige.engine._tickDelta / 1000, 8, 3);
            }
            else {
                this._world.Step(1 / 60, 8, 3);
            }
            // Loop the physics objects and move the entities they are assigned to
            tempBod = this._world.GetBodyList();
            while (tempBod) {
                if (tempBod._entity) {
                    // Body has an entity assigned to it
                    entity = tempBod._entity; //this.ige.entities.read(tempBod.m_userData);
                    entityBox2dBody = entity._box2dBody;
                    if (!entityBox2dBody)
                        continue;
                    // Check if the body is awake and is dynamic (we don't transform static bodies)
                    if (tempBod.IsAwake() && tempBod.m_type !== 0) {
                        // Update the entity data to match the body data
                        entityBox2dBody.updating = true;
                        entity.translateTo(tempBod.m_xf.position.x * this._scaleRatio, tempBod.m_xf.position.y * this._scaleRatio, entity._translate.z);
                        entity.rotateTo(entity._rotate.x, entity._rotate.y, tempBod.GetAngle());
                        entityBox2dBody.updating = false;
                        if (entityBox2dBody.asleep) {
                            // The body was asleep last frame, fire an awake event
                            entityBox2dBody.asleep = false;
                            this.emit("afterAwake", entity);
                        }
                    }
                    else {
                        if (!entityBox2dBody.asleep) {
                            // The body was awake last frame, fire an asleep event
                            entityBox2dBody.asleep = true;
                            this.emit("afterAsleep", entity);
                        }
                    }
                }
                tempBod = tempBod.GetNext();
            }
            // Clear forces because we have ended our physics simulation frame
            this._world.ClearForces();
            tempBod = null;
            entity = null;
            if (typeof this._updateCallback === "function") {
                this._updateCallback();
            }
        }
    };
    destroy() {
        // Stop processing box2D steps
        this.stop();
        // Destroy all box2D world bodies
        return this;
    }
}
