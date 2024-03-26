import type { IgeCollisionMap2d } from "@/engine/core/IgeCollisionMap2d";
import { IgeGenericPathFinder } from "@/engine/core/IgeGenericPathFinder";
import { IgePathNode } from "@/engine/core/IgePathNode";
import type { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";

/**
 * Creates a new tile-based pathfinder using the A*
 * path-finding algorithm. Extends the IgeGenericPathFinder
 * class and implements the `isTraversalAllowed()` and
 * `getConnections()` methods that the generic pathfinder
 * uses to generate a path.
 */
export class IgePathFinder extends IgeGenericPathFinder {
	classId = "IgePathFinder";
	_squareCost: number = 10;
	_diagonalCost: number = 10;
	_tileMap: IgeCollisionMap2d | IgeTileMap2d;
	_allowSquare: boolean;
	_allowDiagonal: boolean;

	constructor (tileMap: IgeCollisionMap2d | IgeTileMap2d, allowSquare: boolean = true, allowDiagonal: boolean = true) {
		super();
		this._tileMap = tileMap;
		this._allowSquare = allowSquare;
		this._allowDiagonal = allowDiagonal;
	}

	/**
	 * Gets / sets the cost of movement over a square (left,
	 * right, up, down) adjacent tile.
	 * @param {number} [val]
	 */
	squareCost (val: number): this;
	squareCost (): number;
	squareCost (val?: number) {
		if (val !== undefined) {
			this._squareCost = val;
			return this;
		}

		return this._squareCost;
	}

	/**
	 * Gets / sets the cost of movement over a diagonal (northwest,
	 * northeast, southwest, southeast) adjacent tile.
	 * @param {number} [val]
	 */
	diagonalCost (val: number): this;
	diagonalCost (): number;
	diagonalCost (val?: number) {
		if (val !== undefined) {
			this._diagonalCost = val;
			return this;
		}

		return this._diagonalCost;
	}

	/**
	 * Gets / sets the limit on the number of neighbour nodes
	 * that the pathfinder will analyse before reaching its
	 * target tile. On large maps this limit should be increased
	 * to allow pathing where many neighbours need to be
	 * considered.
	 * @param {number} [val]
	 */
	neighbourLimit (val: number): this;
	neighbourLimit (): number;
	neighbourLimit (val?: number) {
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
	getConnections (
		currentNode: IgePathNode,
		endPoint: IgePathNode
	): IgePathNode[] {
		const list: IgePathNode[] = [];
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
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._squareCost,
					this.cost({ x: newX, y: newY, z: newZ }, this._squareCost),
					currentNode,
					"W"
				);
				list.push(newNode);
			}

			newX = x + 1;
			newY = y;
			//tileData = this._tileMap.map.tileData(newX, newY) || null;
			if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._squareCost,
					this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._squareCost),
					currentNode,
					"E"
				);
				list.push(newNode);
			}

			newX = x;
			newY = y - 1;
			//tileData = this._tileMap.map.tileData(newX, newY) || null;
			if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._squareCost,
					this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._squareCost),
					currentNode,
					"N"
				);
				list.push(newNode);
			}

			newX = x;
			newY = y + 1;
			//tileData = this._tileMap.map.tileData(newX, newY) || null;
			if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._squareCost,
					this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._squareCost),
					currentNode,
					"S"
				);
				list.push(newNode);
			}
		}

		if (this._allowDiagonal) {
			newX = x - 1;
			newY = y - 1;
			//tileData = this._tileMap.map.tileData(newX, newY) || null;
			if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._diagonalCost,
					this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost),
					currentNode,
					"NW"
				);
				list.push(newNode);
			}

			newX = x + 1;
			newY = y - 1;
			//tileData = this._tileMap.map.tileData(newX, newY) || null;
			if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._diagonalCost,
					this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost),
					currentNode,
					"NE"
				);
				list.push(newNode);
			}

			newX = x - 1;
			newY = y + 1;
			//tileData = this._tileMap.map.tileData(newX, newY) || null;
			if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._diagonalCost,
					this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost),
					currentNode,
					"SW"
				);
				list.push(newNode);
			}

			newX = x + 1;
			newY = y + 1;
			//tileData = this._tileMap.map.tileData(newX, newY) || null;
			if (this.isTraversalAllowed({ x: newX, y: newY, z: newZ }, { x, y, z })) {
				const newNode = new IgePathNode(
					newX,
					newY,
					newZ,
					currentNode.g,
					this._diagonalCost,
					this.cost({ x: newX, y: newY, z: newZ }, endPoint, this._diagonalCost),
					currentNode,
					"SE"
				);
				list.push(newNode);
			}
		}

		return list;
	}
}
