import { IgeEventingClass } from "../../../core/IgeEventingClass";
export declare class IgeBox2dWorld extends IgeEventingClass {
    classId: string;
    constructor(entity: any, options: any);
    /**
     * Creates a Box2d fixture and returns it.
     * @param params
     * @return {b2FixtureDef}
     */
    createFixture(params: any): any;
    /**
     * Creates a Box2d body and attaches it to an IGE entity
     * based on the supplied body definition.
     * @param {IgeEntityBox2d} entity
     * @param {Object} body
     * @return {b2Body}
     */
    createBody(entity: any, body: any): any;
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
    staticsFromMap(mapLayer: any, callback: any): void;
    /**
     * Creates a contact listener with the specified callbacks. When
     * contacts begin and end inside the box2d simulation the specified
     * callbacks are fired.
     * @param {Function} beginContactCallback The method to call when the contact listener detects contact has started.
     * @param {Function} endContactCallback The method to call when the contact listener detects contact has ended.
     * @param {Function} preSolve
     * @param {Function} postSolve
     */
    contactListener(beginContactCallback: any, endContactCallback: any, preSolve: any, postSolve: any): void;
    /**
     * If enabled, sets the physics world into network debug mode which
     * will stop the world from generating collisions but still allow us
     * to see shape outlines as they are attached to bodies. Useful when
     * your physics system is server-side but seeing client-side shape
     * data is useful for debugging collisions.
     * @param {Boolean} val
     */
    networkDebugMode(val: any): any;
    /**
     * Creates a debug entity that outputs the bounds of each box2d
     * body during standard engine ticks.
     * @param {IgeEntity} mountScene
     */
    enableDebug(mountScene: any): void;
    /**
     * Queues a body for removal from the physics world.
     * @param body
     */
    destroyBody(body: any): void;
    /**
     * Gets / sets the callback method that will be called after
     * every physics world step.
     * @param method
     * @return {*}
     */
    updateCallback(method: any): any;
    start(): void;
    stop(): void;
    /**
     * Steps the physics simulation forward.
     * @param ctx
     * @private
     */
    _behaviour(entity: any, ctx: any): void;
    destroy(): this;
}
