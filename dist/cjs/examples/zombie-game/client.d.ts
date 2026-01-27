import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
import { type IgeGltfModel } from "../../engine/webgl/IgeGltfLoader.js"
/**
 * Zombie Game - 4 Player Split Screen Example
 *
 * Demonstrates:
 * - 4-player split screen with independent isometric cameras
 * - Hospital lobby built from primitive geometry
 * - Skeletal animated player models (CesiumMan.glb placeholder)
 * - WASD keyboard controls for Player 1
 * - Per-viewport camera tracking
 */
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    renderer?: IgeWebGlRenderer;
    scene?: IgeScene2d;
    viewports: IgeViewport[];
    playerEntities: IgeEntity[];
    playerModel?: IgeGltfModel;
    keysDown: Record<string, boolean>;
    cameraOffset: {
        x: number;
        y: number;
        z: number;
    };
    constructor();
    init(): Promise<void>;
    setupScene(): void;
    setupLights(): void;
    /**
     * Creates a box entity with the given dimensions, position, and color,
     * then mounts it to the scene.
     */
    private createBox;
    /**
     * Build the hospital lobby from primitive box geometry.
     *
     * Layout (top-down, Y is up):
     * - Large floor on XZ plane
     * - Walls around perimeter (with entrance gap in front wall)
     * - Reception desk at the back
     * - Pillars for structure
     * - Benches along side walls
     */
    createHospitalLobby(): void;
    loadPlayerModel(): Promise<void>;
    createPlayers(): void;
    /**
     * Create 4 viewports arranged in a 2x2 grid.
     * All viewports share the same scene but each has its own camera.
     *
     * Layout:
     * +------+------+
     * |  P1  |  P2  |  (top row)
     * +------+------+
     * |  P3  |  P4  |  (bottom row)
     * +------+------+
     *
     * WebGL viewport coordinates use (0,0) at bottom-left, so:
     * - P1 (top-left):     x=0,       y=halfH
     * - P2 (top-right):    x=halfW,   y=halfH
     * - P3 (bottom-left):  x=0,       y=0
     * - P4 (bottom-right): x=halfW,   y=0
     */
    setupSplitScreenViewports(): void;
    /**
     * Pre-compute the isometric camera offset vector.
     * This offset is added to each player's position to get
     * the camera position for that viewport.
     */
    computeCameraOffset(): void;
    /**
     * Position each viewport's camera at its player's isometric offset.
     */
    updateCameraPositions(): void;
    /**
     * Each frame, update each viewport's camera to follow its
     * assigned player from an isometric angle.
     */
    setupCameraTracking(): void;
    setupInput(): void;
    /**
     * Player 1 movement via WASD keys.
     * W=-Z, S=+Z, A=-X, D=+X. Rotates to face movement direction.
     */
    setupPlayerMovement(): void;
    /**
     * Update viewport positions and sizes when the window is resized.
     */
    updateViewportLayout(): void;
    updateStatus(status: string): void;
    updatePlayerCount(count: number): void;
    updateStats(): void;
    hideLoadingScreen(): void;
}
