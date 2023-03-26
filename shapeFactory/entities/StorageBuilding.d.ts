import { Square } from "./base/Square";
import { ResourceType } from "../enums/ResourceType";
import { FlagBuilding } from "./FlagBuilding";
export declare class StorageBuilding extends Square {
    classId: string;
    flag?: FlagBuilding;
    constructor();
    streamCreateConstructorArgs(): never[];
    /**
     * Takes a resource from the resource pool and dumps it back onto the
     * map for it to decide where to route itself.
     */
    dispenseResource(type: ResourceType): void;
    _updateOnServer(): void;
}
