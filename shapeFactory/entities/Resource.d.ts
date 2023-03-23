import { Circle } from "./base/Circle";
import { ResourceType } from "../enums/ResourceType";
import { Building } from "./base/Building";
export declare class Resource extends Circle {
    _type: ResourceType;
    _locationId: string;
    _destinationId: string;
    _location?: Building;
    _destination?: Building;
    _pathIds: string[];
    constructor(type: ResourceType, locationId: string, destinationId: string);
    streamCreateConstructorArgs(): (string | ResourceType)[];
    setNavigation(): void;
    onDropped(droppedLocationId: string): void;
    calculateTransportPath(): void;
}
