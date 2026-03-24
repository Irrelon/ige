import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
/**
 * 2D Orthographic Coordinate System Test.
 *
 * Renders colored cubes at known world positions using a front-facing
 * orthographic camera, then reads back pixels to verify that:
 *   +X world = right on screen
 *   +Y world = up on screen (lower pixel Y)
 *   +Z world = toward viewer (in front of other objects)
 */
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    constructor();
    init(): Promise<void>;
    private _waitFrames;
}
