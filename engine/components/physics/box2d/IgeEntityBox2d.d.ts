import { IgeEntity } from "../../../core/IgeEntity";
import type { IgeBox2dController } from "./IgeBox2dController";
import type { IgeBox2dBodyDef } from "@/types/IgeBox2dBodyDef";
import { Box2D } from "@/engine/components/physics/box2d/lib_box2d";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { IgeEventListenerCallback } from "@/engine/core/IgeEventingClass";
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
    _box2dBody?: Box2D.Dynamics.b2Body;
    _box2dOurContactFixture?: Box2D.Dynamics.b2Fixture;
    _box2dTheirContactFixture?: Box2D.Dynamics.b2Fixture;
    _box2dNoDebug: boolean;
    _collisionStartListeners?: IgeEntityBox2dCollisionListener[];
    _collisionEndListeners?: IgeEntityBox2dCollisionListener[];
    _contactListener?: Box2D.Dynamics.b2ContactListener;
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
    /**
     * Gets / sets the Box2D body's gravitic value. If set to false,
     * this entity will not be affected by gravity. If set to true it
     * will be affected by gravity.
     * @param {boolean=} val True to allow gravity to affect this entity.
     * @returns {*}
     */
    gravitic(val?: boolean): boolean | this | undefined;
    on(eventName: string, id: string, listener: IgeEventListenerCallback): this;
    on(eventName: string, listener: IgeEventListenerCallback): this;
    off(eventName: string, id: string, listener?: IgeEventListenerCallback): this;
    off(eventName: string, listener?: IgeEventListenerCallback): this;
    off(eventName: string): this;
    _setupContactListeners(): Box2D.Dynamics.b2ContactListener;
    _checkContact(contact: Box2D.Dynamics.Contacts.b2Contact, arr: IgeEntityBox2dCollisionListener[]): void;
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
     * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
     * @param {number} tickDelta The delta between the last tick time and this one.
     */
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
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
