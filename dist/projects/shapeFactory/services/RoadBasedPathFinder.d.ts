import type { IgeGenericPathFinderNode } from "../../../engine/core/IgeGenericPathFinder.js"
import { IgeGenericPathFinder } from "../../../engine/core/IgeGenericPathFinder.js"
export declare class RoadBasedPathFinder extends IgeGenericPathFinder {
    getNode(id: string): IgeGenericPathFinderNode | null;
    getConnections(currentNode: IgeGenericPathFinderNode, targetNode: IgeGenericPathFinderNode): IgeGenericPathFinderNode[];
}
