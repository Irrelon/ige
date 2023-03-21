import { IgeEntity } from "../../../core/IgeEntity";
import type { IgeBox2dController } from "./IgeBox2dController";
import type { IgeBox2dBodyDef } from "@/types/IgeBox2dBodyDef";
import type { Box2D } from "@/engine/components/physics/box2d/lib_box2d";
/**
 * Creates a new entity with box2d integration.
 */
export declare class IgeEntityBox2d extends IgeEntity {
    classId: string;
    _b2dRef: IgeBox2dController;
    _box2dBodyDef?: IgeBox2dBodyDef;
    _box2dBody?: Box2D.Dynamics.b2Body;
    _box2dOurContactFixture?: Box2D.Dynamics.b2Fixture;
    _box2dTheirContactFixture?: Box2D.Dynamics.b2Fixture;
    constructor();
    /**
     * Gets / sets the box2d body's active flag which determines
     * if it will be included as part of the physics simulation
     * or not.
     * @param {Boolean=} val Set to true to include the body in
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
     * @param {Boolean=} val True to allow gravity to affect this entity.
     * @returns {*}
     */
    gravitic(val?: boolean): boolean | this | undefined;
    on(): void;
    off(): void;
    _setupContactListeners(): void;
    _checkContact(contact: any, arr: any): void;
    /**
     * Takes over translateTo calls and processes Box2D movement as well.
     * @param x
     * @param y
     * @param z
     * @return {*}
     * @private
     */
    _translateTo(x: any, y: any, z: any): this;
    /**
     * Takes over translateBy calls and processes Box2D movement as well.
     * @param x
     * @param y
     * @param z
     * @private
     */
    _translateBy(x: any, y: any, z: any): void;
    /**
     * Takes over translateTo calls and processes Box2D movement as well.
     * @param x
     * @param y
     * @param z
     * @return {*}
     * @private
     */
    _rotateTo(x: any, y: any, z: any): this;
    /**
     * Takes over translateBy calls and processes Box2D movement as well.
     * @param x
     * @param y
     * @param z
     * @private
     */
    _rotateBy(x: any, y: any, z: any): void;
    /**
     * Purely for networkDebugMode handling, ensures that an entity's transform is
     * not taken over by the physics simulation and is instead handled by the engine.
     * @param ctx
     * @private
     */
    _update(ctx: any): void;
    /**
     * If true, disabled Box2D debug shape drawing for this entity.
     * @param {Boolean} val
     */
    box2dNoDebug(val: any): any;
    /**
     * Destroys the physics entity and the Box2D body that
     * is attached to it.
     */
    destroy(): this;
}
