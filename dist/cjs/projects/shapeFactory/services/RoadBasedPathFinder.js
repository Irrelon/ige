"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadBasedPathFinder = void 0;
const IgeGenericPathFinder_1 = require("../../../engine/core/IgeGenericPathFinder.js");
const instance_1 = require("../../../engine/instance.js");
class RoadBasedPathFinder extends IgeGenericPathFinder_1.IgeGenericPathFinder {
    getNode(id) {
        const allBuildings = instance_1.ige.$$("building");
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
        const allRoads = instance_1.ige.$$("road");
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
exports.RoadBasedPathFinder = RoadBasedPathFinder;
