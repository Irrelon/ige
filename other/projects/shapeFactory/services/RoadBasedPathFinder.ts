import type { IgeGenericPathFinderNode } from "@/engine/core/IgeGenericPathFinder";
import { IgeGenericPathFinder } from "@/engine/core/IgeGenericPathFinder";
import { ige } from "@/engine/exports";
import type { Road } from "../entities/Road";
import type { Building } from "../entities/base/Building";

export class RoadBasedPathFinder extends IgeGenericPathFinder {
	getNode (id: string): IgeGenericPathFinderNode | null {
		const allBuildings = ige.$$("building") as Building[];
		const building = allBuildings.find((tmpBuilding) => tmpBuilding._id === id);
		if (!building) return null;

		return {
			_id: building._id as string,
			x: building._translate.x,
			y: building._translate.y,
			cost: 0
		};
	}

	getConnections (currentNode: IgeGenericPathFinderNode, targetNode: IgeGenericPathFinderNode) {
		const allRoads = ige.$$("road") as Road[];

		const filteredRoads = allRoads.filter((road) => {
			return road._toId === currentNode._id || road._fromId === currentNode._id;
		});

		return filteredRoads.reduce((pathNodes: IgeGenericPathFinderNode[], road) => {
			if (road._fromId === currentNode._id) {
				const pathNode = this.getNode(road._toId);
				if (pathNode) {
					pathNode.cost = this.cost(pathNode.x, pathNode.y, targetNode.x, targetNode.y);
					pathNode.link = currentNode;
					pathNodes.push(pathNode);
				}
				return pathNodes;
			}

			const pathNode = this.getNode(road._fromId);

			if (pathNode) {
				pathNode.cost = this.cost(pathNode.x, pathNode.y, targetNode.x, targetNode.y);
				pathNode.link = currentNode;
				pathNodes.push(pathNode);
			}

			return pathNodes;
		}, []);
	}
}
