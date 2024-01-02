import { IgeEntityBox2d } from "@/engine/components/physics/box2d/IgeEntityBox2d";
import { SpaceStationDefinition } from "../../types/SpaceStationDefinition";

export declare class SpaceStation extends IgeEntityBox2d {
	classId: string;
	_publicGameData: Record<string, any>;
	constructor(publicGameData: SpaceStationDefinition["public"]);
	streamCreateConstructorArgs(): Record<string, any>[];
}
