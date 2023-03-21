import { IgeBox2dTimingMode } from "@/enums/IgeBox2dTimingMode";
import { IgeEntity } from "../../../core/IgeEntity";
import { IgeTileMap2d, IgeTileMap2dScanRectCallback } from "../../../core/IgeTileMap2d";
import { IgeEntityBox2d } from "./IgeEntityBox2d";
import type { IgeBox2dBodyDef } from "@/types/IgeBox2dBodyDef";
import type { IgeBox2dContactListenerCallback } from "@/types/IgeBox2dContactListenerCallback";
import type { IgeBox2dContactPostSolveCallback, IgeBox2dContactPreSolveCallback } from "@/types/IgeBox2dContactSolverCallback";
import type { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";
import { Box2D } from "@/engine/components/physics/box2d/lib_box2d";
import { IgeBox2dFixtureDef } from "@/types/IgeBox2dFixtureDef";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
/**
 * The engine's Box2D component class.
 */
export declare class IgeBox2dController extends IgeEventingClass {
    classId: string;
    componentId: string;
    _intervalTimer?: number;
    _active: boolean;
    _renderMode: IgeBox2dTimingMode;
    _useWorker: boolean;
    _sleep: boolean;
    _scaleRatio: number;
    _gravity: Box2D.Common.Math.b2Vec2;
    _removeWhenReady: Box2D.Dynamics.b2Body[];
    _networkDebugMode: boolean;
    _box2dDebug: boolean;
    _updateCallback?: () => void;
    _world?: Box2D.Dynamics.b2World;
    b2Color: typeof Box2D.Common.b2Color;
    b2Vec2: typeof Box2D.Common.Math.b2Vec2;
    b2Math: typeof Box2D.Common.Math.b2Math;
    b2Shape: typeof Box2D.Collision.Shapes.b2Shape;
    b2BodyDef: typeof Box2D.Dynamics.b2BodyDef;
    b2Body: typeof Box2D.Dynamics.b2Body;
    b2FixtureDef: typeof Box2D.Dynamics.b2FixtureDef;
    b2Fixture: typeof Box2D.Dynamics.b2Fixture;
    b2World: typeof Box2D.Dynamics.b2World;
    b2MassData: typeof Box2D.Collision.Shapes.b2MassData;
    b2PolygonShape: typeof Box2D.Collision.Shapes.b2PolygonShape;
    b2CircleShape: typeof Box2D.Collision.Shapes.b2CircleShape;
    b2DebugDraw: typeof Box2D.Dynamics.b2DebugDraw;
    b2ContactListener: typeof Box2D.Dynamics.b2ContactListener;
    b2Distance: typeof Box2D.Collision.b2DistanceOutput;
    b2Contact: typeof Box2D.Dynamics.Contacts.b2Contact;
    b2FilterData: typeof Box2D.Dynamics.b2FilterData;
    b2DistanceJointDef: typeof Box2D.Dynamics.Joints.b2DistanceJointDef;
    constructor();
    /**
     * Starts the physics simulation. Without calling this, no physics operations will be processed.
     */
    start(): void;
    /**
     * Stops the physics simulation. You can start it again and resume where it left off by calling start().
     */
    stop(): void;
    useWorker(val?: boolean): boolean | this | undefined;
    /**
     * Gets / sets the world interval mode. In mode 0 (zero) the
     * box2D simulation is synced to the framerate of the engine's
     * renderer. In mode 1 the box2D simulation is stepped at a constant
     * speed regardless of the engine's renderer. This must be set *before*
     * calling the start() method in order for the setting to take effect.
     * @param {Integer} val The mode, either 0 or 1.
     * @returns {*}
     */
    mode(val?: IgeBox2dTimingMode): this | IgeBox2dTimingMode;
    /**
     * Gets / sets if the world should allow sleep or not.
     * @param {Boolean=} val
     * @return {*}
     */
    sleep(val: boolean): this;
    sleep(): boolean;
    /**
     * Gets / sets the current engine-to-box2D scaling ratio.
     * @param val
     * @return {*}
     */
    scaleRatio(val?: number): number | this;
    /**
     * Gets / sets the gravity vector.
     * @param x
     * @param y
     * @return {*}
     */
    gravity(x: number, y: number): this;
    gravity(): Box2D.Common.Math.b2Vec2;
    /**
     * Gets the current Box2D world object.
     * @return {b2World}
     */
    world(): Box2D.Dynamics.b2World | undefined;
    /**
     * Creates the Box2D world.
     * @return {*}
     */
    createWorld(): this;
    /**
     * Creates a Box2D fixture and returns it.
     * @param params
     * @return {b2FixtureDef}
     */
    createFixture(params: IgeBox2dFixtureDef): Box2D.Dynamics.b2FixtureDef;
    /**
     * Creates a Box2D body and attaches it to an IGE entity
     * based on the supplied body definition.
     * @param {IgeEntity} entity
     * @param {Object} body
     * @return {b2Body}
     */
    createBody(entity: IgeEntityBox2d, body: IgeBox2dBodyDef): Box2D.Dynamics.b2Body;
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
    staticsFromMap(mapLayer: IgeTileMap2d, callback?: IgeTileMap2dScanRectCallback): void;
    /**
     * Creates a contact listener with the specified callbacks. When
     * contacts begin and end inside the box2D simulation the specified
     * callbacks are fired.
     * @param {Function} beginContactCallback The method to call when the contact listener detects contact has started.
     * @param {Function} endContactCallback The method to call when the contact listener detects contact has ended.
     * @param {Function} preSolve
     * @param {Function} postSolve
     */
    contactListener(beginContactCallback?: IgeBox2dContactListenerCallback, endContactCallback?: IgeBox2dContactListenerCallback, preSolve?: IgeBox2dContactPreSolveCallback, postSolve?: IgeBox2dContactPostSolveCallback): void;
    /**
     * If enabled, sets the physics world into network debug mode which
     * will stop the world from generating collisions but still allow us
     * to see shape outlines as they are attached to bodies. Useful when
     * your physics system is server-side but seeing client-side shape
     * data is useful for debugging collisions.
     * @param {Boolean} val
     */
    networkDebugMode(val?: boolean): boolean | this;
    /**
     * Creates a debug entity that outputs the bounds of each box2D
     * body during standard engine ticks.
     * @param {IgeEntity} mountScene
     */
    enableDebug(mountScene?: IgeEntity): void;
    /**
     * Queues a body for removal from the physics world.
     * @param body
     */
    destroyBody(body: Box2D.Dynamics.b2Body): void;
    /**
     * Gets / sets the callback method that will be called after
     * every physics world step.
     * @param method
     * @return {*}
     */
    updateCallback(method: () => void): this | (() => void) | undefined;
    /**
     * Steps the physics simulation forward.
     * @private
     */
    _behaviour: IgeEntityBehaviourMethod;
    destroy(): this;
}
