import { AsteroidBeltDefinition } from "./AsteroidBeltDefinition";
import { JumpGateDefinition } from "./JumpGateDefinition";
import { SpaceStationDefinition } from "./SpaceStationDefinition";

export interface StarSystemDefinition {
	_id: string;
	name: string;
	station?: SpaceStationDefinition[];
	jumpGate: JumpGateDefinition[];
	asteroidBelt?: AsteroidBeltDefinition[];
}
