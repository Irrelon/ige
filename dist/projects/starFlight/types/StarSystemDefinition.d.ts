import type { AsteroidBeltDefinition } from "./AsteroidBeltDefinition.js"
import type { JumpGateDefinition } from "./JumpGateDefinition.js"
import type { SpaceStationDefinition } from "./SpaceStationDefinition.js"
export interface StarSystemDefinition {
    _id: string;
    name: string;
    station?: SpaceStationDefinition[];
    jumpGate: JumpGateDefinition[];
    asteroidBelt?: AsteroidBeltDefinition[];
}
