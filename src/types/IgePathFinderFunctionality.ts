import type { IgeCanId } from "@/types/IgeCanId";

export interface IgePathFinderFunctionality<DataType extends IgeCanId = any> {
	isTraversalAllowed: (
		pointTraverseTo: DataType,
		pointTraverseFrom?: DataType
	) => boolean;
	getConnections: (
		currentNode: DataType,
		targetNode: DataType
	) => DataType[];
	generate: (
		startPoint: DataType,
		endPoint: DataType,
		allowInvalidDestination: boolean
	) => DataType[];
	cost: (pointA: any, pointB: any, moveCost?: number) => number;
}
