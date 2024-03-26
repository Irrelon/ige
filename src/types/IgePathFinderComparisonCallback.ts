export type IgePathFinderComparisonCallback = (
	tileData: any,
	newX: number,
	newY: number,
	newZ: number,
	currentNodeData?: any,
	x?: number | null,
	y?: number | null,
	z?: number | null,
	dynamic?: boolean
) => boolean;
