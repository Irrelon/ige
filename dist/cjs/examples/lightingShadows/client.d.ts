import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import type { IgeCamera } from "../../engine/core/IgeCamera.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
import { IgeAmbientLight, IgeDirectionalLight, IgePointLight, IgeSpotLight } from "../../engine/webgl/IgeWebGlLight.js"
import { type IgeGltfModel } from "../../engine/webgl/IgeGltfLoader.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
/**
 * Lighting & Shadows Example
 *
 * Demonstrates the IGE lighting and shadow system with:
 * - A static street lamp (spot light pointing down)
 * - A swinging/pendulum light (animated point light)
 * - Moonlight (directional light with shadows)
 * - An animated skeletal character (CesiumMan) casting shadows
 * - A ground plane and scene props to receive shadows
 */
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    scene?: IgeScene2d;
    camera?: IgeCamera;
    viewport?: IgeViewport;
    renderer?: IgeWebGlRenderer;
    ambientLight?: IgeAmbientLight;
    moonLight?: IgeDirectionalLight;
    streetLampLight?: IgeSpotLight;
    swingingLight?: IgePointLight;
    orbitLight?: IgePointLight;
    orbitBulb?: IgeEntity;
    greenOrbitLight?: IgePointLight;
    greenOrbitBulb?: IgeEntity;
    greenOrbitAngleOffset: number;
    greenOrbitPaused: boolean;
    lightingEnabled: boolean;
    groundEntity?: IgeEntity;
    lampPostEntities: IgeEntity[];
    swingingLightEntity?: IgeEntity;
    animatedModel?: IgeGltfModel;
    animatedEntity?: IgeEntity;
    animationNames: string[];
    sceneEntities: IgeEntity[];
    swingAngle: number;
    swingSpeed: number;
    orbitAngleOffset: number;
    orbitPaused: boolean;
    cameraAngleOffset: number;
    cameraPaused: boolean;
    cameraOrbitRadius: number;
    cameraOrbitHeight: number;
    constructor();
    init(): Promise<void>;
    setupScene(): void;
    setupLights(): void;
    /**
     * Generate a cylinder geometry for the lamp post.
     */
    createCylinderGeometry(radiusTop: number, radiusBottom: number, height: number, segments: number, id: string): IgeGeometryData3d;
    createSceneGeometry(): void;
    loadAnimatedModel(): Promise<void>;
    preloadTextures(): Promise<void>;
    createAnimatedEntity(): void;
    setupAnimations(): void;
    setupKeyboardControls(): void;
    toggleShadows(): void;
    cycleShadowDebugMode(): void;
    toggleLight(light: IgePointLight | IgeSpotLight | IgeDirectionalLight | undefined, name: string): void;
    toggleAllLights(): void;
    buildLightGUI(): void;
    updateLightCount(): void;
    updateShadowStatus(status: string): void;
    updateStatus(status: string): void;
    updateStats(): void;
    hideLoadingScreen(): void;
}
