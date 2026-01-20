import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import { IgeCamera } from "../../engine/core/IgeCamera.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
import { IgeAmbientLight, IgeDirectionalLight, IgePointLight } from "../../engine/webgl/IgeWebGlLight.js"
import { type IgeGltfModel } from "../../engine/webgl/IgeGltfLoader.js"
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    scene?: IgeScene2d;
    camera?: IgeCamera;
    viewport?: IgeViewport;
    renderer?: IgeWebGlRenderer;
    entities: IgeEntity[];
    cubeEntities: IgeEntity[];
    rotationSpeeds: number[];
    isPerspective: boolean;
    ambientLight?: IgeAmbientLight;
    directionalLight?: IgeDirectionalLight;
    pointLight?: IgePointLight;
    lightingEnabled: boolean;
    duckModel?: IgeGltfModel;
    duckEntities: IgeEntity[];
    cameraAnimationEnabled: boolean;
    constructor();
    init(): Promise<void>;
    setupScene(): void;
    setupLights(): void;
    createTestEntities(): void;
    create3DEntities(): void;
    loadGltfModel(): Promise<void>;
    setupCameraAnimation(): void;
    setupKeyboardControls(): void;
    toggleShadows(): void;
    cycleShadowDebugMode(): void;
    toggleLighting(): void;
    updateStatus(status: string): void;
    updateStats(): void;
    hideLoadingScreen(): void;
}
