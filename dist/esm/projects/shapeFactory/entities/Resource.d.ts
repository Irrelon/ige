import { Building } from "./base/Building";
import { GameEntity } from "./base/GameEntity";
import { ResourceType } from "../enums/ResourceType";

export declare class Resource extends GameEntity {
	_type: ResourceType;
	_locationId: string;
	_destinationId: string;
	_location?: Building;
	_destination?: Building;
	_pathIds: string[];
	constructor(type: ResourceType, locationId: string);
	streamCreateConstructorArgs(): string[];
	selectDestination(): void;
	setNavigation(): void;
	onDropped(droppedLocationId: string): void;
	calculateTransportPath(): void;
	destroy(): this;
}
