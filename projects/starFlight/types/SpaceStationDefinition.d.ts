import { JobDefinition } from "./JobDefinition";
import { ResourceDefinition } from "./ResourceDefinition";
import { AreaInteriorDefinition } from "./AreaInteriorDefinition";
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
