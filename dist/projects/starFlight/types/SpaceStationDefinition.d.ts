import type { AreaInteriorDefinition } from "./AreaInteriorDefinition.js"
import type { JobDefinition } from "./JobDefinition.js"
import type { ResourceDefinition } from "./ResourceDefinition.js"
export interface SpaceStationDefinition {
    _id: string;
    name: string;
    classId: string;
    public: {
        texture: string;
    };
    position: number[];
    market: {
        jobs: JobDefinition[];
        resources: ResourceDefinition[];
    };
    interior: AreaInteriorDefinition[];
}
