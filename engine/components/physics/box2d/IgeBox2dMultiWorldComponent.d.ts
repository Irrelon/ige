import { IgeEventingClass } from "../../../core/IgeEventingClass";
/**
 * The engine's box2d multi-world component class.
 */
export declare class IgeBox2dMultiWorldComponent extends IgeEventingClass {
    classId: string;
    componentId: string;
    constructor(entity: any, options: any);
    /**
     * Gets the Box2d world object by it's id.
     * @return {b2World}
     */
    world(id: any): any;
    /**
     * Creates the Box2d world.
     * @param {String} id
     * @param {Object=} options
     * @return {*}
     */
    createWorld(options: any): any;
}
