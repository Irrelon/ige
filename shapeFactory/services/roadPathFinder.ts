import { RoadBasedPathFinder } from "./RoadBasedPathFinder";

export const roadPathFinder = (fromBuildingId: string, toBuildingId: string): string[] => {
	const pathFinder = new RoadBasedPathFinder();
	const sourceNode = pathFinder.getNode(fromBuildingId);
	const targetNode = pathFinder.getNode(toBuildingId);

	if (!sourceNode || !targetNode) {
		console.log("No source or no target found in path finding!");
		return [];
	}

	return pathFinder.generate(sourceNode, targetNode).map((pathItem) => {
		return pathItem._id;
	});
}
