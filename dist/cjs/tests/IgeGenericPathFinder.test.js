"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeGenericPathFinder_1 = require("../engine/core/IgeGenericPathFinder.js");
const graph = [{
        _id: "1",
        x: 0,
        y: 0,
        z: 0,
        connectsTo: ["2", "3"]
    }, {
        _id: "2",
        x: 1,
        y: 0,
        z: 0,
        connectsTo: ["1"]
    }, {
        _id: "3",
        x: -1,
        y: 1,
        z: 0,
        connectsTo: ["1", "2", "3", "4", "5"]
    }, {
        _id: "4",
        x: -25,
        y: -12,
        z: 5,
        connectsTo: ["3", "6"]
    }, {
        _id: "5",
        x: 15,
        y: 12,
        z: 5,
        connectsTo: ["3", "5", "6"]
    }, {
        _id: "6",
        x: -10,
        y: 50,
        z: 100,
        connectsTo: ["4", "5"]
    }];
class MyPathFinder extends IgeGenericPathFinder_1.IgeGenericPathFinder {
    getGraphItem(id) {
        return graph.find((item) => item._id === id);
    }
    getConnections(currentNode, targetNode) {
        // Get the current graph data
        const graphItem = this.getGraphItem(currentNode._id);
        if (!graphItem)
            return [];
        return (graphItem.connectsTo.map((connectionId) => {
            const connectionItem = this.getGraphItem(connectionId);
            if (!connectionItem)
                return null;
            return connectionItem;
        })).filter((item) => item !== null);
    }
}
describe("IgeGenericPathFinder", () => {
    it("can instantiate a new path finder", () => {
        const pathFinder = new MyPathFinder();
        const path = pathFinder.generate({
            _id: "1",
            x: 0,
            y: 0,
            z: 0,
            connectsTo: ["2, 3"]
        }, {
            _id: "6",
            x: -10,
            y: 50,
            z: 100,
            connectsTo: ["4", "5"]
        });
        expect(path.map((item) => item._id)).toStrictEqual(["3", "5", "6"]);
    });
});
