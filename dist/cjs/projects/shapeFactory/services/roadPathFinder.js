"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roadPathFinder = void 0;
const RoadBasedPathFinder_1 = require("./RoadBasedPathFinder");
const roadPathFinder = (fromBuildingId, toBuildingId) => {
    const pathFinder = new RoadBasedPathFinder_1.RoadBasedPathFinder();
    const sourceNode = pathFinder.getNode(fromBuildingId);
    const targetNode = pathFinder.getNode(toBuildingId);
    if (!sourceNode || !targetNode) {
        console.log("No source or no target found in path finding!");
        return [];
    }
    return pathFinder.generate(sourceNode, targetNode).map((pathItem) => {
        return pathItem._id;
    });
};
exports.roadPathFinder = roadPathFinder;
