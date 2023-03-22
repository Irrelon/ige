import { SpaceStationDefinition } from "./SpaceStationDefinition";
import { JumpGateDefinition } from "./JumpGateDefinition";
import { AsteroidBeltDefinition } from "./AsteroidBeltDefinition";

export interface StarSystemDefinition {
	_id: string;
	name: string;
	station?: SpaceStationDefinition[];
	jumpGate: JumpGateDefinition[];
	asteroidBelt?: AsteroidBeltDefinition[];
}
