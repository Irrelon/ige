import type { IgeEventListenerCallback } from "../../../../export/exports.js"
import type { IgeBox2dController } from "../../../../export/exports.js"
import type { b2Body } from "../../../../export/exports.js"
import type { b2Contact } from "../../../../export/exports.js"
import type { b2Fixture } from "../../../../export/exports.js"
import type { b2ContactListener } from "../../../../export/exports.js"
import { IgeEntity } from "../../../../export/exports.js"
import type { IgeBox2dBodyDef } from "../../../../export/exports.js"
export interface IgeEntityBox2dCollisionListener {
    type: number;
    target: string;
    callback: (...args: any[]) => void;
}
/**
 * Creates a new entity with Box2D integration.
 */
export declare class IgeEntityBox2d extends IgeEntity {
    classId: string;
    _b2dRef: IgeBox2dController;
    _box2dBodyDef?: IgeBox2dBodyDef;
    _box2dBody?: b2Body;
    _box2dOurContactFixture?: b2Fixture;
    _box2dTheirContactFixture?: b2Fixture;
    _box2dNoDebug: boolean;
    _collisionStartListeners?: IgeEntityBox2dCollisionListener[];
    _collisionEndListeners?: IgeEntityBox2dCollisionListener[];
    _contactListener?: b2ContactListener;
    constructor();
    /**
     * Gets / sets the Box2D body's active flag which determines
     * if it will be included as part of the physics simulation
     * or not.
     * @param {boolean=} val Set to true to include the body in
     * the physics simulation or false for it to be ignored.
     * @return {*}
     */
    box2dActive(val?: boolean): boolean | this;
    /**
     * Gets / sets the physics body definition. When setting the
     * definition the physics body will also be created automatically
     * from the supplied definition.
     * @param def
     * @return {*}
     */
    box2dBody(def: IgeBox2dBodyDef): this;
    box2dBody(): IgeBox2dBodyDef;
    on(eventName: string, id: string, listener: IgeEventListenerCallback): this;
    on(eventName: string, listener: IgeEventListenerCallback): this;
    off(eventName: string, id: string, listener?: IgeEventListenerCallback): this;
    off(eventName: string, listener?: IgeEventListenerCallback): this;
    off(eventName: string): this;
    _setupContactListeners(): b2ContactListener;
    _checkContact(contact: b2Contact, arr: IgeEntityBox2dCollisionListener[]): void;
    /**
     * Takes over translateTo calls and processes Box2D movement as well.
     * @param x
     * @param y
     * @param z
     * @return {*}
     * @private
     */
    translateTo(x: number, y: number, z: number): this;
    /**
     * Takes over translateTo calls and processes Box2D movement as well.
     * @param x
     * @param y
     * @param z
     * @return {*}
     * @private
     */
    rotateTo(x: number, y: number, z: number): this;
    /**
     * Processes the updates required each render frame. Any code in the update()
     * method will be called ONCE for each render frame BEFORE the tick() method.
     * This differs from the tick() method in that the tick method can be called
     * multiple times during a render frame depending on how many viewports your
     * simulation is being rendered to, whereas the update() method is only called
     * once. It is therefore the perfect place to put code that will control your
     * entity's motion, AI etc.
     * @param {number} tickDelta The delta between the last tick time and this one.
     */
    update(tickDelta: number): void;
    /**
     * If true, disabled Box2D debug shape drawing for this entity.
     * @param {boolean} val
     */
    box2dNoDebug(val?: boolean): boolean | this;
    /**
     * Destroys the physics entity and the Box2D body that
     * is attached to it.
     */
    destroy(): this;
}
