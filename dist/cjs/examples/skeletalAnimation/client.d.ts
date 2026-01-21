import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import type { IgeCamera } from "../../engine/core/IgeCamera.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
import { IgeAmbientLight, IgeDirectionalLight } from "../../engine/webgl/IgeWebGlLight.js"
import { type IgeGltfModel } from "../../engine/webgl/IgeGltfLoader.js"
/**
 * Skeletal Animation Example
 *
 * This example demonstrates how to load and play skeletal animations
 * from GLTF models using the IGE WebGL renderer.
 *
 * IMPORTANT: You need an animated GLTF/GLB model for this example to work.
 * Place your animated model in the assets/models/ directory.
 *
 * Recommended test models:
 * - https://github.com/KhronosGroup/glTF-Sample-Models (see "AnimatedMorphCube", "RiggedSimple", "CesiumMan")
 * - Models exported from Blender with armature animations
 *
 * Converting FBX to GLTF:
 * 1. Import FBX into Blender
 * 2. Select mesh and armature
 * 3. File > Export > glTF 2.0 (.glb)
 * 4. Check "Include: Selected Objects" and "Include: Armatures"
 */
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    scene?: IgeScene2d;
    camera?: IgeCamera;
    viewport?: IgeViewport;
    renderer?: IgeWebGlRenderer;
    ambientLight?: IgeAmbientLight;
    directionalLight?: IgeDirectionalLight;
    animatedModel?: IgeGltfModel;
    animatedEntity?: IgeEntity;
    animationNames: string[];
    constructor();
    init(): Promise<void>;
    setupScene(): void;
    setupLights(): void;
    loadAnimatedModel(): Promise<void>;
    preloadTextures(): Promise<void>;
    createAnimatedEntity(): void;
    setupCameraAnimation(): void;
    setupKeyboardControls(): void;
    updateAnimationDisplay(animName: string): void;
    updateStatus(status: string): void;
    updateStats(): void;
    hideLoadingScreen(): void;
}
