import { IgeGenericPathFinder } from "./IgeGenericPathFinder.js"
import { IgePathNode } from "./IgePathNode.js"
/**
 * Creates a new tile-based pathfinder using the A*
 * path-finding algorithm. Extends the IgeGenericPathFinder
 * class and implements the `isTraversalAllowed()` and
 * `getConnections()` methods that the generic pathfinder
 * uses to generate a path.
 */
export class IgePathFinder extends IgeGenericPathFinder {
    classId = "IgePathFinder";
    _squareCost = 10;
    _diagonalCost = 10;
    _tileMap;
    _allowSquare;
    _allowDiagonal;
    constructor(tileMap, allowSquare = true, allowDiagonal = true) {
        super();
        this._tileMap = tileMap;
        this._allowSquare = allowSquare;
        this._allowDiagonal = allowDiagonal;
    }
    squareCost(val) {
        if (val !== undefined) {
            this._squareCost = val;
            return this;
        }
        return this._squareCost;
    }
    diagonalCost(val) {
        if (val !== undefined) {
            this._diagonalCost = val;
            return this;
        }
        return this._diagonalCost;
    }
    neighbourLimit(val) {
        if (val !== undefined) {
            this._neighbourLimit = val;
            return this;
        }
        return this._neighbourLimit;
    }
    /**
     * Get all the neighbors of a node for the A* algorithm.
     * @param {IgePathNode} currentNode The current node along the path to evaluate neighbors for.
     * @param {IgePathNode} endPoint The end point of the path.
     * @return {IgePathNode[]} An array containing nodes describing the neighbouring tiles of the current node.
     * @private
     */
    getConnections(currentNode, endPoint) {
        const list = [];
        const { x, y, z } = currentNode;
        let newX = 0;
        let newY = 0;
        let newZ = 0;
        //const currentNodeData = this._tileMap.map.tileData(x, y);
        //let tileData: any;
        if (this._allowSquare) {
            newX = x - 1;
            newY = y;
            newZ = z;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._squareCost, this.cost({ x: newX, y: newY, z: newZ }, this._squareCost), currentNode, "W");
                list.push(newNode);
            }
            newX = x + 1;
            newY = y;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._squareCost, this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._squareCost), currentNode, "E");
                list.push(newNode);
            }
            newX = x;
            newY = y - 1;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._squareCost, this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._squareCost), currentNode, "N");
                list.push(newNode);
            }
            newX = x;
            newY = y + 1;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._squareCost, this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._squareCost), currentNode, "S");
                list.push(newNode);
            }
        }
        if (this._allowDiagonal) {
            newX = x - 1;
            newY = y - 1;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._diagonalCost, this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost), currentNode, "NW");
                list.push(newNode);
            }
            newX = x + 1;
            newY = y - 1;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._diagonalCost, this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost), currentNode, "NE");
                list.push(newNode);
            }
            newX = x - 1;
            newY = y + 1;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._diagonalCost, this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost), currentNode, "SW");
                list.push(newNode);
            }
            newX = x + 1;
            newY = y + 1;
            //tileData = this._tileMap.map.tileData(newX, newY) || null;
            if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
                const newNode = new IgePathNode(newX, newY, newZ, currentNode.g, this._diagonalCost, this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost), currentNode, "SE");
                list.push(newNode);
            }
        }
        return list;
    }
}
