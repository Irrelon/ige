import type { AsteroidBeltDefinition } from "./AsteroidBeltDefinition";
import type { JumpGateDefinition } from "./JumpGateDefinition";
import type { SpaceStationDefinition } from "./SpaceStationDefinition";

export interface StarSystemDefinition {
	_id: string;
	name: string;
	station?: SpaceStationDefinition[];
	jumpGate: JumpGateDefinition[];
	asteroidBelt?: AsteroidBeltDefinition[];
}
