import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import type { IgeEngine } from "./IgeEngine.js";
import type { IgeEntity } from "./IgeEntity.js"
import type { IgeObject } from "./IgeObject.js";
import { IgeScene2d } from "./IgeScene2d.js"
import type { IgeViewport } from "./IgeViewport.js";
import * as THREE from "three";
export declare class IgeThreeJsRenderer extends IgeBaseRenderer {
    classId: string;
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
    protected _pixelScaleDirty: boolean;
    constructor();
    _recalculatePixelScale(): void;
    normaliseScale(mesh: THREE.Mesh, targetWidth: number, targetHeight: number): void;
    normaliseX(targetX: number): number;
    normaliseY(targetY: number): number;
    _resizeEvent: (event?: Event) => void;
    _renderEntities(entityArr?: IgeEntity[]): void;
    renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
    _ensureFrameworkScene(scene: IgeScene2d): void;
    _ensureFrameworkEntity(entity: IgeObject): void;
    _ensureFrameworkInterface(obj: IgeObject): void;
    _transformObject(obj: IgeEntity): void;
}
