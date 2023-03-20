import { IgeGenericPathFinder } from "../../engine/core/IgeGenericPathFinder.js";
import { ige } from "../../engine/instance.js";
export class ResourcePathFinder extends IgeGenericPathFinder {
    getNode(id) {
        const allBuildings = ige.$$("building");
        const building = allBuildings.find((tmpBuilding) => tmpBuilding._id === id);
        if (!building)
            return null;
        return {
            _id: building._id,
            x: building._translate.x,
            y: building._translate.y,
            cost: 0
        };
    }
    getConnections(currentNode, targetNode) {
        const allRoads = ige.$$("road");
        const filteredRoads = allRoads.filter((road) => {
            return road._toId === currentNode._id || road._fromId === currentNode._id;
        });
        return filteredRoads.reduce((pathNodes, road) => {
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
