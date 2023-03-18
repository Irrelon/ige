import IgePoint3d from "./IgePoint3d";
/**
 * Creates a new path node for use with the IgePathFinder class.
 */
declare class IgePathNode extends IgePoint3d {
    classId: string;
    x: number;
    y: number;
    z: number;
    g: number;
    h: number;
    moveCost: number;
    f: number;
    link?: IgePathNode;
    hash: string;
    listType: number;
    direction: string;
    _mode: number;
    _distanceToNext: number;
    _absoluteTimeToNext: number;
    _deltaTimeToNext: number;
    /**
     * @constructor
     * @param {Number} x
     * @param {Number} y
     * @param {Number} g
     * @param {Number} moveCost
     * @param {Number} heuristic
     * @param {Object} parent
     * @param {String} direction
     */
    constructor(x: number, y: number, g: number, moveCost?: number, heuristic?: number, parent?: IgePathNode, direction?: string);
    static fromPoint3d(point3d: IgePoint3d): IgePathNode;
    /**
     * Gets / sets the path node mode. The mode determines if the co-ordinates
     * will be in tile or absolute co-ordinates.
     * @param {Number=} val 0 = tile based, 1 = absolute based.
     * @return {*}
     */
    mode(val?: number): number | this;
}
export default IgePathNode;
