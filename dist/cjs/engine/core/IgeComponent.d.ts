import { IgeEventingClass } from "./IgeEventingClass.js"
export declare class IgeComponent<EntityType> extends IgeEventingClass {
    _entity: EntityType;
    _options?: any;
    componentId: string;
    constructor(parent: EntityType, options?: any);
    destroy(): this;
}
