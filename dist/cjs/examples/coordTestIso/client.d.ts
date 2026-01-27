import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
/**
 * Isometric Coordinate System Test.
 *
 * Renders colored cubes at known world positions using an orthographic camera
 * at the classic isometric angle (35.264 deg elevation, 45 deg azimuth),
 * then reads back pixels to verify correct screen positions.
 *
 * In isometric view (looking from front-right-above):
 *   +X world axis → screen-right and slightly down
 *   +Y world axis → screen-up
 *   +Z world axis → screen-left and slightly down (toward viewer)
 */
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    constructor();
    init(): Promise<void>;
    private _waitFrames;
}
