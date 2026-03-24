import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
/**
 * 3D Camera Rotation Coordinate System Test.
 *
 * Places colored cubes along the X, Y, Z axes, then rotates the camera
 * to three positions (front, right, top) taking pixel snapshots at each
 * to verify correct rendering orientation.
 *
 * Camera positions:
 *   1. Front view: camera at (0, 0, 150) looking at origin
 *   2. Right view: camera at (150, 0, 0) looking at origin
 *   3. Top view:   camera at (0, 150, 0) looking at origin, up=(0, 0, -1)
 */
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    renderer: IgeWebGlRenderer;
    camera: import("../../engine/core/IgeCamera.js").IgeCamera;
    viewport: IgeViewport;
    canvasW: number;
    canvasH: number;
    constructor();
    init(): Promise<void>;
    private _testView;
    private _waitFrames;
}
