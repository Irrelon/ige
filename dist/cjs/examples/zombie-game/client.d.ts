import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
import { IgePointLight } from "../../engine/webgl/IgeWebGlLight.js"
import { type IgeGltfModel } from "../../engine/webgl/IgeGltfLoader.js"
import { IgeParticleSystem3d } from "../../engine/webgl/IgeParticleSystem3d.js"
import { IgeDecalSystem3d } from "../../engine/webgl/IgeDecalSystem3d.js"
import { IgeGamePadComponent } from "../../engine/components/IgeGamePadComponent.js"
import { type IgeLevelObstacle } from "./level.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
interface PlayerState {
    index: number;
    entity: IgeEntity;
    lantern: IgePointLight;
    health: number;
    kills: number;
    attackCooldown: number;
    hitFlash: number;
    respawnTimer: number;
    invulnerable: number;
    idleTime: number;
    facingX: number;
    facingZ: number;
}
interface ZombieState {
    entity: IgeEntity;
    health: number;
    speed: number;
    attackCooldown: number;
    hitFlash: number;
    knockbackX: number;
    knockbackZ: number;
    respawnTimer: number;
    alive: boolean;
}
interface DamageNumber {
    el: HTMLDivElement;
    viewportIndex: number;
    x: number;
    y: number;
    z: number;
    age: number;
}
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    renderer?: IgeWebGlRenderer;
    scene?: IgeScene2d;
    gamePad?: IgeGamePadComponent;
    viewports: IgeViewport[];
    players: PlayerState[];
    zombies: ZombieState[];
    characterModel?: IgeGltfModel;
    obstacles: IgeLevelObstacle[];
    bloodFx?: IgeParticleSystem3d;
    bloodStains?: IgeDecalSystem3d;
    slashFx?: IgeParticleSystem3d;
    damageNumbers: DamageNumber[];
    fxLayer?: HTMLDivElement;
    keysDown: Record<string, boolean>;
    keysPressed: Record<string, boolean>;
    totalKills: number;
    cameraOffset: {
        x: number;
        y: number;
        z: number;
    };
    grid: Map<number, ZombieState[]>;
    constructor();
    init(): Promise<void>;
    lodFromUrl(): boolean;
    zombieCountFromUrl(): number;
    setupLights(): void;
    createEffects(): void;
    createPlayers(): void;
    createZombies(count: number): void;
    swordParts?: {
        blade: IgeGeometryData3d;
        guard: IgeGeometryData3d;
        grip: IgeGeometryData3d;
    };
    /**
     * Put a sword in a character's right hand. The sword root follows the
     * hand bone; its parts are ordinary children of it. Sizes are in the
     * character's model units (it is about 1.2 units tall), because the
     * sword inherits the character's scale. Every player shares the same
     * geometry, so the four swords draw as instanced batches.
     */
    createSword(owner: IgeEntity): void;
    placeZombieAwayFromPlayers(zombie: ZombieState): void;
    tick(dt: number): void;
    readPlayerInput(index: number): {
        moveX: number;
        moveZ: number;
        attack: boolean;
    };
    updatePlayer(player: PlayerState, dt: number): void;
    playerAttack(player: PlayerState): void;
    nearestZombie(x: number, z: number, maxDist: number): ZombieState | undefined;
    shoveZombiesAway(x: number, z: number, radius: number): void;
    killZombie(zombie: ZombieState): void;
    rebuildGrid(): void;
    updateZombie(zombie: ZombieState, dt: number): void;
    damagePlayer(player: PlayerState, damage: number): void;
    /** Player tint, or a red hit flash via the emissive override. */
    applyPlayerMaterial(player: PlayerState): void;
    applyZombieMaterial(zombie: ZombieState): void;
    createFxLayer(): void;
    spawnDamageNumber(viewportIndex: number, x: number, y: number, z: number, damage: number): void;
    updateDamageNumbers(dt: number): void;
    /**
     * Create 4 viewports arranged in a 2x2 grid.
     * All viewports share the same scene but each has its own camera.
     *
     * WebGL viewport coordinates use (0,0) at bottom-left, so:
     * - P1 (top-left):     x=0,       y=halfH
     * - P2 (top-right):    x=halfW,   y=halfH
     * - P3 (bottom-left):  x=0,       y=0
     * - P4 (bottom-right): x=halfW,   y=0
     */
    setupSplitScreenViewports(): void;
    updateViewportLayout(): void;
    /** Pre-compute the isometric camera offset from a player. */
    computeCameraOffset(): void;
    /** Position each viewport's camera at its player's isometric offset. */
    updateCameraPositions(): void;
    setupInput(): void;
    updatePlayerHud(): void;
    updateStatus(status: string): void;
    updatePlayerCount(count: number): void;
    updateStats(): void;
    hideLoadingScreen(): void;
}
export {};
