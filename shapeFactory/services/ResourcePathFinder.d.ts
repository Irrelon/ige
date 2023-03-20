import { IgeGenericPathFinder, IgeGenericPathFinderNode } from "@/engine/core/IgeGenericPathFinder";
export declare class ResourcePathFinder extends IgeGenericPathFinder {
    getNode(id: string): IgeGenericPathFinderNode | null;
    getConnections(currentNode: IgeGenericPathFinderNode, targetNode: IgeGenericPathFinderNode): IgeGenericPathFinderNode[];
}
