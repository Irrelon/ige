import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import type { IgeEngine } from "./IgeEngine.js";
import type { IgeViewport } from "./IgeViewport.js"
import * as THREE from "three";
export declare class IgeThreeJsRenderer extends IgeBaseRenderer {
    protected _threeJsRenderer: THREE.WebGLRenderer;
    protected _threeJsScene: THREE.Scene;
    protected _threeJsCamera: THREE.PerspectiveCamera;
    protected _pixelScale: {
        normalDistance: number;
        fovRadians: number;
        fovWidth: number;
        fovHeight: number;
        pixelWidth: number;
        pixelHeight: number;
    };
    constructor();
    _recalculatePixelScale(): void;
    normaliseScale(geometry: THREE.BufferGeometry, targetWidth: number, targetHeight: number): void;
    normaliseX(targetX: number): number;
    normaliseY(targetY: number): number;
    _resizeEvent: (event?: Event) => void;
    renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
}
