import type { AreaInteriorDefinition } from "./AreaInteriorDefinition";
import type { JobDefinition } from "./JobDefinition";
import type { ResourceDefinition } from "./ResourceDefinition";

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
