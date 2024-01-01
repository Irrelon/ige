import { IgePoint3d } from "./IgePoint3d";
/**
 * Creates a new path node for use with the IgePathFinder class.
 */
export class IgePathNode extends IgePoint3d {
    classId = "IgePathNode";
    x;
    y;
    z;
    g;
    h;
    moveCost;
    f;
    link;
    hash;
    listType;
    direction;
    _mode;
    _distanceToNext = 0;
    _absoluteTimeToNext = 0;
    _deltaTimeToNext = 0;
    /**
     * @constructor
     * @param {number} x
     * @param {number} y
     * @param {number} g
     * @param {number} moveCost
     * @param {number} heuristic
     * @param {Object} parent
     * @param {string} direction
     */
    constructor(x, y, g, moveCost = 0, heuristic = 0, parent, direction = "") {
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
    static fromPoint3d(point3d) {
        return new IgePathNode(point3d.x, point3d.y, point3d.z);
    }
    /**
     * Gets / sets the path node mode. The mode determines if the co-ordinates
     * will be in tile or absolute co-ordinates.
     * @param {number=} val 0 = tile based, 1 = absolute based.
     * @return {*}
     */
    mode(val) {
        if (val !== undefined) {
            this._mode = val;
            return this;
        }
        return this._mode;
    }
}
