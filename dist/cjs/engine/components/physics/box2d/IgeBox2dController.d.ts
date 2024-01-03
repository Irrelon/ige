import { IgeEntityBox2d } from "../../../../export/exports.js"
import { b2FixtureDef } from "../../../../export/exports.js"
import { b2ContactListener } from "../../../../export/exports.js"
import type { IgeEntity } from "../../../../export/exports.js"
import { IgeEventingClass } from "../../../../export/exports.js"
import type { IgeTileMap2d, IgeTileMap2dScanRectCallback } from "../../../../export/exports.js"
import { b2Vec2 } from "../../../../export/exports.js"
import type { b2Body } from "../../../../export/exports.js"
import { b2World } from "../../../../export/exports.js"
import { IgeBox2dTimingMode } from "../../../../export/exports.js"
import type { IgeBox2dBodyDef } from "../../../../export/exports.js"
import type { IgeBox2dContactListenerCallback } from "../../../../export/exports.js"
import type { IgeBox2dContactPostSolveCallback, IgeBox2dContactPreSolveCallback } from "../../../../export/exports.js"
import type { IgeBox2dFixtureDef } from "../../../../export/exports.js"
import type { IgeEntityBehaviourMethod } from "../../../../export/exports.js"
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
    _gravity: b2Vec2;
    _removeWhenReady: b2Body[];
    _networkDebugMode: boolean;
    _box2dDebug: boolean;
    _updateCallback?: () => void;
    _world?: b2World;
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
     * @param {boolean=} val
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
    gravity(): b2Vec2;
    /**
     * Gets the current Box2D world object.
     * @return {b2World}
     */
    world(): b2World | undefined;
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
    createFixture(params: IgeBox2dFixtureDef): b2FixtureDef;
    /**
     * Creates a Box2D body and attaches it to an IGE entity
     * based on the supplied body definition.
     * @param {IgeEntity} entity
     * @param {Object} body
     * @return {b2Body}
     */
    createBody(entity: IgeEntityBox2d, body: IgeBox2dBodyDef): b2Body;
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
    contactListener(beginContactCallback?: IgeBox2dContactListenerCallback, endContactCallback?: IgeBox2dContactListenerCallback, preSolve?: IgeBox2dContactPreSolveCallback, postSolve?: IgeBox2dContactPostSolveCallback): b2ContactListener;
    /**
     * If enabled, sets the physics world into network debug mode which
     * will stop the world from generating collisions but still allow us
     * to see shape outlines as they are attached to bodies. Useful when
     * your physics system is server-side but seeing client-side shape
     * data is useful for debugging collisions.
     * @param {boolean} val
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
    destroyBody(body: b2Body): void;
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
