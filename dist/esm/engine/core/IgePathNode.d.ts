import { IgePoint3d } from "./IgePoint3d.js"
import type { IgeCompassDirection } from "../../types/IgeCompassDirection.js";
/**
 * Creates a new path node for use with the IgePathFinder class.
 */
export declare class IgePathNode extends IgePoint3d {
    classId: string;
    g: number;
    h: number;
    moveCost: number;
    f: number;
    link?: IgePathNode;
    hash: string;
    listType: number;
    direction: IgeCompassDirection | "";
    _mode: number;
    _distanceToNext: number;
    _absoluteTimeToNext: number;
    _deltaTimeToNext: number;
    /**
     * @constructor
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} g
     * @param {number} moveCost
     * @param {number} heuristic
     * @param {Object} parent
     * @param {string} direction
     */
    constructor(x: number, y: number, z: number, g: number, moveCost?: number, heuristic?: number, parent?: IgePathNode, direction?: IgeCompassDirection | "");
    static fromPoint3d(point3d: IgePoint3d, g?: number): IgePathNode;
    /**
     * Gets / sets the path node mode. The mode determines if the co-ordinates
     * will be in tile or absolute co-ordinates.
     * @param {number=} val 0 = tile based, 1 = absolute based.
     * @return {*}
     */
    mode(val?: number): number | this;
}
