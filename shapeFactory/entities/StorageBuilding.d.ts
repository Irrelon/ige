import { Square } from "./base/Square";
import { ResourceType } from "../enums/ResourceType";
export declare class StorageBuilding extends Square {
    classId: string;
    constructor();
    streamCreateConstructorArgs(): never[];
    /**
     * Takes a resource from the resource pool and dumps it back onto the
     * map for it to decide where to route itself.
     */
    dispenseResource(type: ResourceType): void;
    _updateOnServer(): void;
}
