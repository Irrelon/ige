import { ige } from "../../../instance";
import { IgeBox2dTimingMode } from "@/enums/IgeBox2dTimingMode";
import { IgeEntity } from "../../../core/IgeEntity";
import { IgeBox2dBodyType } from "@/enums/IgeBox2dBodyType";
import { IgeBox2dFixtureShapeType } from "@/enums/IgeBox2dFixtureShapeType";
import { IgeTileMap2d, IgeTileMap2dScanRectCallback } from "../../../core/IgeTileMap2d";
import { IgeBox2dDebugPainter } from "./IgeBox2dDebugPainter";
import { IgeEntityBox2d } from "./IgeEntityBox2d";
import type { IgeBox2dBodyDef } from "@/types/IgeBox2dBodyDef";
import type { IgeBox2dContactListenerCallback } from "@/types/IgeBox2dContactListenerCallback";
import type {
	IgeBox2dContactPostSolveCallback,
	IgeBox2dContactPreSolveCallback
} from "@/types/IgeBox2dContactSolverCallback";
import type { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";
import { IgeBehaviourType } from "@/enums/IgeBehaviourType";
import { Box2D } from "@/engine/components/physics/box2d/lib_box2d";
import { IgeBox2dFixtureDef } from "@/types/IgeBox2dFixtureDef";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";

/**
 * The engine's Box2D component class.
 */
export class IgeBox2dController extends IgeEventingClass {
	classId = "IgeBox2dController";
	componentId = "box2d";

	_intervalTimer?: number;
	_active: boolean = false;
	_renderMode: IgeBox2dTimingMode = IgeBox2dTimingMode.matchEngine;
	_useWorker: boolean = false;
	_sleep: boolean = true;
	_scaleRatio: number = 1;
	_gravity: Box2D.Common.Math.b2Vec2;
	_removeWhenReady: Box2D.Dynamics.b2Body[];
	_networkDebugMode: boolean = false;
	_box2dDebug: boolean = false;
	_updateCallback?: () => void;
	_world?: Box2D.Dynamics.b2World;

	b2Color = Box2D.Common.b2Color;
	b2Vec2 = Box2D.Common.Math.b2Vec2;
	b2Math = Box2D.Common.Math.b2Math;
	b2Shape = Box2D.Collision.Shapes.b2Shape;
	b2BodyDef = Box2D.Dynamics.b2BodyDef;
	b2Body = Box2D.Dynamics.b2Body;
	b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
	b2Fixture = Box2D.Dynamics.b2Fixture;
	b2World = Box2D.Dynamics.b2World;
	b2MassData = Box2D.Collision.Shapes.b2MassData;
	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
	b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
	b2ContactListener = Box2D.Dynamics.b2ContactListener;
	b2Distance = Box2D.Collision.b2DistanceOutput;
	b2Contact = Box2D.Dynamics.Contacts.b2Contact;
	b2FilterData = Box2D.Dynamics.b2FilterData;
	b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;

	constructor () {
		super();

		this._renderMode = 0;

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
		this.b2Distance = Box2D.Collision.b2DistanceOutput;
		this.b2Contact = Box2D.Dynamics.Contacts.b2Contact;
		this.b2FilterData = Box2D.Dynamics.b2FilterData;
		this.b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;

		// Extend the b2Contact class to allow the IGE entity accessor
		// and other helper methods
		this.b2Contact.prototype.igeEntityA = function () {
			const ent = this.m_fixtureA.m_body._entity;
			ent._box2dOurContactFixture = this.m_fixtureA;
			ent._box2dTheirContactFixture = this.m_fixtureB;
			return ent;
		};

		this.b2Contact.prototype.igeEntityB = function () {
			const ent = this.m_fixtureB.m_body._entity;
			ent._box2dOurContactFixture = this.m_fixtureB;
			ent._box2dTheirContactFixture = this.m_fixtureA;
			return ent;
		};

		this.b2Contact.prototype.igeEitherId = function (id1: string, id2: string): boolean {
			if (!id2) {
				return this.m_fixtureA.m_body._entity._id === id1 || this.m_fixtureB.m_body._entity._id === id1;
			} else {
				return (this.m_fixtureA.m_body._entity._id === id1 || this.m_fixtureB.m_body._entity._id === id1) &&
					(this.m_fixtureA.m_body._entity._id === id2 || this.m_fixtureB.m_body._entity._id === id2);
			}
		};

		this.b2Contact.prototype.igeEitherCategory = function (category1: string, category2: string): boolean {
			if (!category2) {
				return this.m_fixtureA.m_body._entity._category === category1 || this.m_fixtureB.m_body._entity._category === category1;
			} else {
				return (this.m_fixtureA.m_body._entity._category === category1 || this.m_fixtureB.m_body._entity._category === category1) &&
					(this.m_fixtureA.m_body._entity._category === category2 || this.m_fixtureB.m_body._entity._category === category2);
			}
		};

		this.b2Contact.prototype.igeBothCategories = function (category: string): boolean {
			return (this.m_fixtureA.m_body._entity._category === category && this.m_fixtureB.m_body._entity._category === category);
		};

		this.b2Contact.prototype.igeEntityByCategory = function (category: string): IgeEntityBox2d | undefined {
			if (this.m_fixtureA.m_body._entity._category === category) {
				return this.igeEntityA();
			}

			if (this.m_fixtureB.m_body._entity._category === category) {
				return this.igeEntityB();
			}
		};

		this.b2Contact.prototype.igeEntityById = function (id: string): IgeEntityBox2d | undefined {
			if (this.m_fixtureA.m_body._entity._id === id) {
				return this.igeEntityA();
			}

			if (this.m_fixtureB.m_body._entity._id === id) {
				return this.igeEntityB();
			}
		};

		this.b2Contact.prototype.igeEntityByFixtureId = function (id: string): IgeEntityBox2d | undefined {
			if (this.m_fixtureA.igeId === id) {
				return this.igeEntityA();
			}

			if (this.m_fixtureB.igeId === id) {
				return this.igeEntityB();
			}
		};

		this.b2Contact.prototype.igeOtherEntity = function (bodyEntity: IgeEntityBox2d): IgeEntityBox2d | undefined {
			if (this.m_fixtureA.m_body._entity === bodyEntity) {
				return this.igeEntityB();
			} else {
				return this.igeEntityA();
			}
		};

		this._sleep = true;
		this._scaleRatio = 30;
		this._gravity = new this.b2Vec2(0, 0);

		this._removeWhenReady = [];
	}

	/**
	 * Starts the physics simulation. Without calling this, no physics operations will be processed.
	 */
	start () {
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
		if (this._renderMode === 0) {
			ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "box2dStep", this._behaviour);
		} else {
			this._intervalTimer = setInterval(this._behaviour, 1000 / 60) as unknown as number;
		}
	}

	/**
	 * Stops the physics simulation. You can start it again and resume where it left off by calling start().
	 */
	stop () {
		if (!this._active) {
			return;
		}

		this._active = false;

		// Remove the box2D behaviour from the engine
		if (this._renderMode === 0) {
			ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, "box2dStep");
		} else {
			clearInterval(this._intervalTimer);
		}
	}

	useWorker (val?: boolean) {
		if (typeof (Worker) !== "undefined") {
			if (val !== undefined) {
				this._useWorker = val;
				return this;
			}

			return this._useWorker;
		} else {
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
	mode (val?: IgeBox2dTimingMode) {
		if (val !== undefined) {
			this._renderMode = val;
			return this;
		}

		return this._renderMode;
	}

	/**
	 * Gets / sets if the world should allow sleep or not.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	sleep (val: boolean): this;
	sleep (): boolean;
	sleep (val?: boolean) {
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
	scaleRatio (val?: number) {
		if (val !== undefined) {
			this._scaleRatio = val;
			return this;
		}

		return this._scaleRatio;
	}

	/**
	 * Gets / sets the gravity vector.
	 * @param x
	 * @param y
	 * @return {*}
	 */
	gravity (x: number, y: number): this;
	gravity (): Box2D.Common.Math.b2Vec2;
	gravity (x?: number, y?: number) {
		if (x !== undefined && y !== undefined) {
			this._gravity = new this.b2Vec2(x, y);
			return this;
		}

		return this._gravity;
	}

	/**
	 * Gets the current Box2D world object.
	 * @return {b2World}
	 */
	world () {
		return this._world;
	}

	/**
	 * Creates the Box2D world.
	 * @return {*}
	 */
	createWorld (): this {
		this._world = new this.b2World(
			this._gravity,
			this._sleep
		);

		this.log("World created");

		return this;
	}

	/**
	 * Creates a Box2D fixture and returns it.
	 * @param params
	 * @return {b2FixtureDef}
	 */
	createFixture (params: IgeBox2dFixtureDef) {
		const tempDef: Box2D.Dynamics.b2FixtureDef = new this.b2FixtureDef();

		for (const param in params) {
			if (param !== "shape" && param !== "filter") {
				// @ts-ignore
				tempDef[param] = params[param as keyof Box2D.Dynamics.b2FixtureDef];
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
	createBody (entity: IgeEntityBox2d, body: IgeBox2dBodyDef): Box2D.Dynamics.b2Body {
		if (!this._world) {
			throw new Error("No box2D world instantiated!");
		}

		const tempDef = new this.b2BodyDef();
		let param,
			fixtureDef,
			tempFixture,
			finalFixture,
			tempShape,
			tempFilterData,
			i,
			finalX, finalY,
			finalWidth, finalHeight;

		// Process body definition and create a box2D body for it
		switch (body.type) {
		case IgeBox2dBodyType.static: // "static"
			tempDef.type = this.b2Body.b2_staticBody;
			break;

		case IgeBox2dBodyType.dynamic: // "dynamic"
			tempDef.type = this.b2Body.b2_dynamicBody;
			break;

		case IgeBox2dBodyType.kinematic: // "kinematic"
			tempDef.type = this.b2Body.b2_kinematicBody;
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
				tempDef[param] = body[param as keyof IgeBox2dBodyDef];
				break;
			}
		}

		// Set the position
		tempDef.position = new this.b2Vec2(entity._translate.x / this._scaleRatio, entity._translate.y / this._scaleRatio);

		// Create the new body
		const tempBod = this._world.CreateBody(tempDef);

		// Now apply any post-creation attributes we need to
		for (param in body) {
			switch (param) {
			case "gravitic":
				if (!body.gravitic) {
					tempBod.m_nonGravitic = true;
				}
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
								tempShape = new this.b2CircleShape();
								if (fixtureDef.shape.data && typeof fixtureDef.shape.data.radius !== "undefined") {
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

							case IgeBox2dFixtureShapeType.polygon:
								tempShape = new this.b2PolygonShape();
								tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
								break;

							case IgeBox2dFixtureShapeType.rectangle:
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
								// @ts-ignore
								finalFixture.igeId = tempFixture.igeId;
							}
						}

						if (fixtureDef.filter && finalFixture) {
							tempFilterData = new this.b2FilterData();

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
				} else {
					this.log("Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.", "warning");
				}
				break;
			}
		}

		// Store the entity that is linked to this body
		tempBod._entity = entity;

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
	staticsFromMap (mapLayer: IgeTileMap2d, callback?: IgeTileMap2dScanRectCallback) {
		if (mapLayer.map) {
			const tileWidth = mapLayer.tileWidth();
			const tileHeight = mapLayer.tileHeight();

			// Get the array of rectangle bounds based on
			// the map's data
			const rectArray = mapLayer.scanRects(callback);
			let rectCount = rectArray.length;

			while (rectCount--) {
				const rect = rectArray[rectCount];

				const posX = (tileWidth * (rect.width / 2));
				const posY = (tileHeight * (rect.height / 2));

				new IgeEntityBox2d()
					.translateTo(rect.x * tileWidth + posX, rect.y * tileHeight + posY, 0)
					.width(rect.width * tileWidth)
					.height(rect.height * tileHeight)
					.drawBounds(true)
					.drawBoundsData(false)
					.box2dBody({
						type: IgeBox2dBodyType.static,
						allowSleep: true,
						fixtures: [{
							shape: {
								type: IgeBox2dFixtureShapeType.rectangle
							}
						}]
					});
			}
		} else {
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
	contactListener (beginContactCallback?: IgeBox2dContactListenerCallback, endContactCallback?: IgeBox2dContactListenerCallback, preSolve?: IgeBox2dContactPreSolveCallback, postSolve?: IgeBox2dContactPostSolveCallback) {
		if (!this._world) {
			throw new Error("No box2D world instantiated!");
		}

		const contactListener = new this.b2ContactListener();

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
	}

	/**
	 * If enabled, sets the physics world into network debug mode which
	 * will stop the world from generating collisions but still allow us
	 * to see shape outlines as they are attached to bodies. Useful when
	 * your physics system is server-side but seeing client-side shape
	 * data is useful for debugging collisions.
	 * @param {Boolean} val
	 */
	networkDebugMode (val?: boolean) {
		if (val !== undefined) {
			this._networkDebugMode = val;

			if (val) {
				// We are enabled so disable all physics contacts
				this.contactListener(
					// Begin contact
					function (contact) {
					},
					// End contact
					function (contact) {
					},
					// Pre-solve
					function (contact) {
						// Cancel the contact
						contact.SetEnabled(false);
					},
					// Post-solve
					function (contact) {
					}
				);
			} else {
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
	enableDebug (mountScene?: IgeEntity) {
		if (!this._world) {
			throw new Error("No box2D world instantiated!");
		}

		if (mountScene) {
			// Define the debug drawing instance
			const debugDraw = new this.b2DebugDraw();
			this._box2dDebug = true;

			debugDraw.SetSprite(ige.engine._ctx as CanvasRenderingContext2D);
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
			new IgeBox2dDebugPainter(ige.engine)
				.depth(40000) // Set a really high depth
				.drawBounds(false)
				.mount(mountScene);
		} else {
			this.log("Cannot enable box2D debug drawing because the passed argument is not an object on the scenegraph.", "error");
		}
	}

	/**
	 * Queues a body for removal from the physics world.
	 * @param body
	 */
	destroyBody (body: Box2D.Dynamics.b2Body) {
		this._removeWhenReady.push(body);
	}

	/**
	 * Gets / sets the callback method that will be called after
	 * every physics world step.
	 * @param method
	 * @return {*}
	 */
	updateCallback (method: () => void) {
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
	_behaviour: IgeEntityBehaviourMethod = () => {
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
			if (this._renderMode === 0) {
				this._world.Step(ige.engine._tickDelta / 1000, 8, 3);
			} else {
				this._world.Step(1 / 60, 8, 3);
			}

			// Loop the physics objects and move the entities they are assigned to
			tempBod = this._world.GetBodyList();

			while (tempBod) {
				if (tempBod._entity) {
					// Body has an entity assigned to it
					entity = tempBod._entity; //this.ige.entities.read(tempBod.m_userData);
					entityBox2dBody = entity._box2dBody;

					if (!entityBox2dBody) continue;

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
					} else {
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

			if (typeof (this._updateCallback) === "function") {
				this._updateCallback();
			}
		}
	};

	destroy () {
		// Stop processing box2D steps
		this.stop();

		// Destroy all box2D world bodies
		return this;
	}
}