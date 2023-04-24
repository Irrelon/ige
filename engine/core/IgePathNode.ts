import { IgePoint3d } from "./IgePoint3d";

/**
 * Creates a new path node for use with the IgePathFinder class.
 */
export class IgePathNode extends IgePoint3d {
	classId = "IgePathNode";

	g: number;
	h: number;
	moveCost: number;
	f: number;
	link?: IgePathNode;
	hash: string;
	listType: number;
	direction: string;
	_mode: number;
	_distanceToNext: number = 0;
	_absoluteTimeToNext: number = 0;
	_deltaTimeToNext: number = 0;

	/**
	 * @constructor
	 * @param {number} x
	 * @param {number} y
	 * @param {number} g
	 * @param {number} moveCost
	 * @param {number} heuristic
	 * @param {Object} parent
	 * @param {string} direction
	 * @param {number} z
	 */
	constructor (x: number, y: number, g: number, moveCost: number = 0, heuristic: number = 0, parent?: IgePathNode, direction: string = "", z: number = 0) {
		super();

		this.x = x;
		this.y = y;
		this.z = 0; // Compat with IgePoint3d
		this.g = g + moveCost; // Cost of moving from the start point along the path to this node (parentNode.g + moveCost)
		this.h = heuristic; // Rough distance to target node
		this.moveCost = moveCost;
		this.f = g + heuristic; // Result of g + heuristic
		this.link = parent;
		this.hash = x + "," + y;
		this.listType = 0;
		this.direction = direction;
		this._mode = 0;
	}

	static fromPoint3d (point3d: IgePoint3d): IgePathNode {
		const node = new IgePathNode(point3d.x, point3d.y, 0);
		node.z = point3d.z;
		return node;
	}

	/**
	 * Gets / sets the path node mode. The mode determines if the co-ordinates
	 * will be in tile or absolute co-ordinates.
	 * @param {number=} val 0 = tile based, 1 = absolute based.
	 * @return {*}
	 */
	mode (val?: number) {
		if (val !== undefined) {
			this._mode = val;
			return this;
		}

		return this._mode;
	}
}
