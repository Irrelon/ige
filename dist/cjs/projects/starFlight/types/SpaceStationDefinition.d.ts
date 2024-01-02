import { AreaInteriorDefinition } from "./AreaInteriorDefinition";
import { JobDefinition } from "./JobDefinition";
import { ResourceDefinition } from "./ResourceDefinition";

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
