import { Circle } from "./base/Circle";
import { ResourceType } from "../enums/ResourceType";
import { Building } from "./base/Building";
export declare class Resource extends Circle {
    _type: ResourceType;
    _destinationId: string;
    _destination?: Building;
    constructor(type: ResourceType, destinationId: string);
    streamCreateConstructorArgs(): (string | ResourceType)[];
}
