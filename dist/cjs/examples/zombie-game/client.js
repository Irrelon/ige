"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const IgeBaseClass_1 = require("../../engine/core/IgeBaseClass.js");
const IgeEntity_1 = require("../../engine/core/IgeEntity.js");
const IgeScene2d_1 = require("../../engine/core/IgeScene2d.js");
const IgeWebGlRenderer_1 = require("../../engine/core/IgeWebGlRenderer.js");
const IgeViewport_1 = require("../../engine/core/IgeViewport.js");
const IgePoint3d_1 = require("../../engine/core/IgePoint3d.js");
const instance_1 = require("../../engine/instance.js");
const enums_1 = require("../../enums/index.js");
const IgeWebGlLight_1 = require("../../engine/webgl/IgeWebGlLight.js");
const IgeGltfLoader_1 = require("../../engine/webgl/IgeGltfLoader.js");
const IgeSkeletalAnimationComponent_1 = require("../../engine/components/IgeSkeletalAnimationComponent.js");
// @ts-ignore
window.ige = instance_1.ige;
// Player configuration
const PLAYER_CONFIGS = [
    { color: { r: 0.3, g: 0.5, b: 1.0 }, name: "Blue", startPos: { x: -150, y: 0, z: 100 } },
    { color: { r: 0.3, g: 1.0, b: 0.5 }, name: "Green", startPos: { x: 150, y: 0, z: 100 } },
    { color: { r: 1.0, g: 0.3, b: 0.3 }, name: "Red", startPos: { x: -150, y: 0, z: 300 } },
    { color: { r: 1.0, g: 1.0, b: 0.3 }, name: "Yellow", startPos: { x: 150, y: 0, z: 300 } }
];
// Camera configuration
const CAMERA_DISTANCE = 500;
const CAMERA_ORTHO_SIZE = 700;
const PLAYER_SPEED = 3;
/**
 * Creates box geometry with arbitrary width, height, and depth.
 * Similar to IgePrimitiveGeometry.createCube but allows non-uniform dimensions.
 */
function createBoxGeometry(w, h, d, id) {
    const hw = w / 2, hh = h / 2, hd = d / 2;
    // prettier-ignore
    const vertices = new Float32Array([
        // Front face (z = +hd)
        -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
        // Back face (z = -hd)
        hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd,
        // Top face (y = +hh)
        -hw, hh, hd, hw, hh, hd, hw, hh, -hd, -hw, hh, -hd,
        // Bottom face (y = -hh)
        -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd, -hw, -hh, hd,
        // Right face (x = +hw)
        hw, -hh, hd, hw, -hh, -hd, hw, hh, -hd, hw, hh, hd,
        // Left face (x = -hw)
        -hw, -hh, -hd, -hw, -hh, hd, -hw, hh, hd, -hw, hh, -hd,
    ]);
    // prettier-ignore
    const normals = new Float32Array([
        // Front
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // Back
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // Top
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // Bottom
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // Right
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // Left
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]);
    // prettier-ignore
    const uvs = new Float32Array([
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
    ]);
    // prettier-ignore
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23,
    ]);
    return {
        id,
        type: "primitive",
        vertices,
        normals,
        uvs,
        indices,
        boundingBox: {
            min: [-hw, -hh, -hd],
            max: [hw, hh, hd]
        },
        boundingSphere: {
            center: [0, 0, 0],
            radius: Math.sqrt(hw * hw + hh * hh + hd * hd)
        }
    };
}
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
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        this.viewports = [];
        this.playerEntities = [];
        this.keysDown = {};
        // Isometric camera offset (computed once)
        this.cameraOffset = { x: 0, y: 0, z: 0 };
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.updateStatus("Creating renderer...");
                // Create WebGL renderer
                this.renderer = new IgeWebGlRenderer_1.IgeWebGlRenderer();
                instance_1.ige.engine.renderer(this.renderer);
                yield this.renderer.setup();
                this.renderer.createFrontBuffer(true);
                // Start the engine
                this.updateStatus("Starting engine...");
                yield instance_1.ige.engine.start();
                // Create shared scene
                this.setupScene();
                // Setup lighting
                this.updateStatus("Setting up lights...");
                this.setupLights();
                // Build hospital lobby
                this.updateStatus("Building hospital lobby...");
                this.createHospitalLobby();
                // Load player model
                this.updateStatus("Loading player models...");
                yield this.loadPlayerModel();
                // Create 4 player entities
                this.updateStatus("Creating players...");
                this.createPlayers();
                // Setup 4-way split screen viewports
                this.updateStatus("Setting up split screen...");
                this.setupSplitScreenViewports();
                // Compute isometric camera offset
                this.computeCameraOffset();
                // Set initial camera positions immediately (so first frame isn't blank)
                this.updateCameraPositions();
                // Setup camera tracking behavior
                this.setupCameraTracking();
                // Setup keyboard input
                this.setupInput();
                // Setup player movement behavior
                this.setupPlayerMovement();
                // Handle window resize
                window.addEventListener("resize", () => this.updateViewportLayout());
                // Hide loading and show game
                this.hideLoadingScreen();
                this.updateStatus("Playing");
                this.updatePlayerCount(this.playerEntities.length);
                // Stats update
                setInterval(() => this.updateStats(), 100);
                this.log("Zombie Game initialized - 4 player split screen active");
            }
            catch (error) {
                this.log(`Error initializing: ${error}`, "error");
                this.updateStatus(`Error: ${error}`);
            }
        });
    }
    setupScene() {
        this.scene = new IgeScene2d_1.IgeScene2d();
        this.scene.id("mainScene");
    }
    setupLights() {
        if (!this.scene || !this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        // Ambient light - cool fluorescent hospital feel
        const ambient = new IgeWebGlLight_1.IgeAmbientLight();
        ambient.id("ambientLight");
        ambient.lightColor(0.5, 0.5, 0.55);
        ambient.intensity(0.7);
        ambient.mount(this.scene);
        lightManager.addLight(ambient);
        // Main directional light (overhead hospital lighting)
        const directional = new IgeWebGlLight_1.IgeDirectionalLight();
        directional.id("directionalLight");
        directional.lightColor(1.0, 0.98, 0.95);
        directional.intensity(1.0);
        directional.direction(-0.2, -1.0, -0.3);
        directional.mount(this.scene);
        lightManager.addLight(directional);
        // Point light in center of lobby
        const point = new IgeWebGlLight_1.IgePointLight();
        point.id("pointLight");
        point.lightColor(0.8, 0.9, 1.0);
        point.intensity(1.2);
        point.range(800);
        point.decay(2);
        point.translateTo(0, 250, 0);
        point.mount(this.scene);
        lightManager.addLight(point);
    }
    /**
     * Creates a box entity with the given dimensions, position, and color,
     * then mounts it to the scene.
     */
    createBox(id, w, h, d, x, y, z, color, metallic = 0.0, roughness = 0.8) {
        const entity = new IgeEntity_1.IgeEntity();
        entity.id(id);
        entity._geometryData = createBoxGeometry(w, h, d, `${id}_geo`);
        entity._materialData = {
            color: { r: color.r, g: color.g, b: color.b, a: 1 },
            metallic,
            roughness
        };
        entity.translateTo(x, y, z);
        entity.mount(this.scene);
        return entity;
    }
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
    createHospitalLobby() {
        const floorColor = { r: 0.85, g: 0.85, b: 0.82 };
        const wallColor = { r: 0.92, g: 0.90, b: 0.85 };
        const pillarColor = { r: 0.75, g: 0.75, b: 0.75 };
        const deskColor = { r: 0.36, g: 0.23, b: 0.12 };
        const benchColor = { r: 0.29, g: 0.47, b: 0.55 };
        const doorFrameColor = { r: 0.5, g: 0.5, b: 0.48 };
        // Floor (XZ plane, thin in Y)
        this.createBox("floor", 2000, 4, 1500, 0, -2, 0, floorColor, 0.0, 0.9);
        // Walls
        // Back wall (full width)
        this.createBox("wallBack", 2000, 300, 20, 0, 150, -750, wallColor);
        // Left wall (full depth)
        this.createBox("wallLeft", 20, 300, 1500, -1000, 150, 0, wallColor);
        // Right wall (full depth)
        this.createBox("wallRight", 20, 300, 1500, 1000, 150, 0, wallColor);
        // Front wall - left section
        this.createBox("wallFrontL", 700, 300, 20, -650, 150, 750, wallColor);
        // Front wall - right section
        this.createBox("wallFrontR", 700, 300, 20, 650, 150, 750, wallColor);
        // Front wall - above entrance
        this.createBox("wallFrontTop", 600, 100, 20, 0, 250, 750, wallColor);
        // Entrance door frames
        this.createBox("doorFrameL", 20, 200, 20, -300, 100, 750, doorFrameColor, 0.2, 0.5);
        this.createBox("doorFrameR", 20, 200, 20, 300, 100, 750, doorFrameColor, 0.2, 0.5);
        // Reception desk (at the back of the lobby)
        this.createBox("receptionDesk", 500, 100, 80, 0, 50, -500, deskColor, 0.1, 0.6);
        // Desk top surface (slightly lighter)
        this.createBox("receptionTop", 500, 6, 80, 0, 103, -500, { r: 0.45, g: 0.32, b: 0.20 }, 0.1, 0.5);
        // Pillars (4 structural columns)
        const pillarPositions = [
            [-400, -300],
            [-400, 300],
            [400, -300],
            [400, 300]
        ];
        for (let i = 0; i < pillarPositions.length; i++) {
            this.createBox(`pillar_${i}`, 50, 300, 50, pillarPositions[i][0], 150, pillarPositions[i][1], pillarColor, 0.1, 0.7);
        }
        // Benches along left wall
        this.createBox("benchL1", 200, 50, 50, -850, 25, -200, benchColor, 0.0, 0.7);
        this.createBox("benchL2", 200, 50, 50, -850, 25, 100, benchColor, 0.0, 0.7);
        this.createBox("benchL3", 200, 50, 50, -850, 25, 400, benchColor, 0.0, 0.7);
        // Benches along right wall
        this.createBox("benchR1", 200, 50, 50, 850, 25, -200, benchColor, 0.0, 0.7);
        this.createBox("benchR2", 200, 50, 50, 850, 25, 100, benchColor, 0.0, 0.7);
        this.createBox("benchR3", 200, 50, 50, 850, 25, 400, benchColor, 0.0, 0.7);
        // Some tables / gurneys in the lobby
        this.createBox("table1", 120, 80, 60, -300, 40, -100, { r: 0.7, g: 0.7, b: 0.72 }, 0.3, 0.5);
        this.createBox("table2", 120, 80, 60, 350, 40, 0, { r: 0.7, g: 0.7, b: 0.72 }, 0.3, 0.5);
        // Vending machine against back wall
        this.createBox("vendingMachine", 80, 180, 60, -600, 90, -700, { r: 0.2, g: 0.3, b: 0.6 }, 0.4, 0.4);
        // Trash can near entrance
        this.createBox("trashCan", 40, 60, 40, 200, 30, 600, { r: 0.35, g: 0.35, b: 0.35 }, 0.3, 0.6);
        this.log("Hospital lobby created");
    }
    loadPlayerModel() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const modelPath = "../../assets/models/CesiumMan.glb";
                this.playerModel = yield IgeGltfLoader_1.igeGltfLoader.load(modelPath, "playerModel");
                this.log(`Player model loaded: ${this.playerModel.name}`);
                this.log(`  Meshes: ${this.playerModel.meshes.length}`);
                this.log(`  Skins: ${((_a = this.playerModel.skins) === null || _a === void 0 ? void 0 : _a.length) || 0}`);
                this.log(`  Animations: ${((_b = this.playerModel.animations) === null || _b === void 0 ? void 0 : _b.length) || 0}`);
                // Preload textures from model materials
                if (this.renderer) {
                    const textureManager = this.renderer._textureManager;
                    if (textureManager) {
                        for (let i = 0; i < this.playerModel.materials.length; i++) {
                            const material = this.playerModel.materials[i];
                            const textureData = material._baseColorTextureData;
                            if (textureData) {
                                const textureId = `player_mat_${i}_baseColor`;
                                yield textureManager.createTextureFromBlob(textureId, textureData);
                                material._baseColorTextureId = textureId;
                            }
                        }
                    }
                }
            }
            catch (error) {
                this.log(`Failed to load player model: ${error}`, "error");
                this.log("Place CesiumMan.glb in assets/models/ to see animated players");
            }
        });
    }
    createPlayers() {
        var _a, _b;
        if (!this.scene || !this.renderer || !this.playerModel)
            return;
        const skeletonManager = this.renderer.skeletonManager;
        if (!skeletonManager)
            return;
        // Find the skinned mesh in the model
        const skinnedMesh = this.playerModel.meshes.find(m => m.primitives.some(p => p.geometry.boneWeights && p.geometry.boneIndices));
        const skinnedPrimitive = skinnedMesh === null || skinnedMesh === void 0 ? void 0 : skinnedMesh.primitives.find(p => p.geometry.boneWeights && p.geometry.boneIndices);
        // Register skeleton data once
        const skin = (_a = this.playerModel.skins) === null || _a === void 0 ? void 0 : _a[0];
        if (skin) {
            skeletonManager.registerSkeletonData(skin.skeleton);
        }
        const baseTextureId = (_b = this.playerModel.materials[0]) === null || _b === void 0 ? void 0 : _b._baseColorTextureId;
        for (let i = 0; i < 4; i++) {
            const config = PLAYER_CONFIGS[i];
            const entity = new IgeEntity_1.IgeEntity();
            entity.id(`player_${i}`);
            // Set geometry from skinned mesh
            if (skinnedPrimitive) {
                entity._geometryData = Object.assign(Object.assign({}, skinnedPrimitive.geometry), { id: `player_${i}_geometry` });
            }
            // Set color-tinted material
            entity._materialData = {
                color: { r: config.color.r, g: config.color.g, b: config.color.b, a: 1 },
                metallic: 0.0,
                roughness: 0.5,
                textureId: baseTextureId
            };
            // Create skeleton instance for this player
            if (skin) {
                const skeletonInstance = skeletonManager.createSkeletonInstance(skin.skeleton.id, `player_${i}_skeleton`);
                if (skeletonInstance) {
                    entity._skeleton = skeletonInstance;
                }
            }
            // Add skeletal animation component
            entity.addComponent("skeletalAnimation", IgeSkeletalAnimationComponent_1.IgeSkeletalAnimationComponent);
            const animComp = entity.components.skeletalAnimation;
            if (entity._skeleton) {
                animComp.setSkeleton(entity._skeleton);
            }
            // Register and play animations
            if (this.playerModel.animations && this.playerModel.animations.length > 0) {
                for (const clip of this.playerModel.animations) {
                    animComp.define(clip.id, clip);
                }
                // Auto-play first animation (walking for CesiumMan)
                animComp.play(this.playerModel.animations[0].id, { crossFadeDuration: 0 });
            }
            // Position and scale
            // CesiumMan is approximately 1.8 units tall, scale up for visibility
            entity.translateTo(config.startPos.x, config.startPos.y, config.startPos.z);
            entity.scaleTo(100, 100, 100);
            // CesiumMan mesh data is in Z-up space; rotate to stand upright in Y-up world.
            // -90° X to stand upright, 180° Y to face toward +Z (toward viewer).
            entity.rotateTo(-Math.PI / 2, Math.PI, 0);
            entity.mount(this.scene);
            this.playerEntities.push(entity);
            this.log(`Player ${i + 1} (${config.name}) created at (${config.startPos.x}, ${config.startPos.y}, ${config.startPos.z})`);
        }
    }
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
    setupSplitScreenViewports() {
        if (!this.scene)
            return;
        const canvasW = instance_1.ige.engine._bounds2d.x;
        const canvasH = instance_1.ige.engine._bounds2d.y;
        const halfW = Math.floor(canvasW / 2);
        const halfH = Math.floor(canvasH / 2);
        // Viewport positions (in WebGL screen coords, origin at bottom-left)
        const vpConfigs = [
            { x: 0, y: halfH }, // P1: top-left
            { x: halfW, y: halfH }, // P2: top-right
            { x: 0, y: 0 }, // P3: bottom-left
            { x: halfW, y: 0 } // P4: bottom-right
        ];
        for (let i = 0; i < 4; i++) {
            const viewport = new IgeViewport_1.IgeViewport();
            viewport.id(`viewport_${i}`);
            viewport.autoSize(false);
            // Set viewport size to quarter of canvas
            viewport._bounds2d.x = halfW;
            viewport._bounds2d.y = halfH;
            // Set viewport position (bottom-left corner in WebGL coords)
            viewport._translate.x = vpConfigs[i].x;
            viewport._translate.y = vpConfigs[i].y;
            // Point at our shared scene
            viewport.scene(this.scene);
            // Configure isometric camera
            const camera = viewport.camera;
            camera.projectionType("orthographic");
            camera.orthoSize(CAMERA_ORTHO_SIZE);
            camera.near(-1500);
            camera.far(3000);
            viewport.mount(instance_1.ige.engine);
            this.viewports.push(viewport);
        }
        this.log(`Created ${this.viewports.length} split-screen viewports`);
    }
    /**
     * Pre-compute the isometric camera offset vector.
     * This offset is added to each player's position to get
     * the camera position for that viewport.
     */
    computeCameraOffset() {
        const isoAngle = Math.atan(1 / Math.sqrt(2)); // ~35.264 degrees
        const angle45 = Math.PI / 4;
        const dist = CAMERA_DISTANCE;
        const horizontalDist = dist * Math.cos(isoAngle);
        this.cameraOffset = {
            x: horizontalDist * Math.sin(angle45),
            y: dist * Math.sin(isoAngle),
            z: horizontalDist * Math.cos(angle45)
        };
    }
    /**
     * Position each viewport's camera at its player's isometric offset.
     */
    updateCameraPositions() {
        const ox = this.cameraOffset.x;
        const oy = this.cameraOffset.y;
        const oz = this.cameraOffset.z;
        for (let i = 0; i < 4; i++) {
            const player = this.playerEntities[i];
            const viewport = this.viewports[i];
            if (!player || !viewport)
                continue;
            const camera = viewport.camera;
            const px = player._translate.x;
            const py = player._translate.y;
            const pz = player._translate.z;
            camera._translate.x = px + ox;
            camera._translate.y = py + oy;
            camera._translate.z = pz + oz;
            camera._lookAt = new IgePoint3d_1.IgePoint3d(px, py, pz);
        }
    }
    /**
     * Each frame, update each viewport's camera to follow its
     * assigned player from an isometric angle.
     */
    setupCameraTracking() {
        if (!this.scene)
            return;
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "cameraTracking", () => {
            this.updateCameraPositions();
        });
    }
    setupInput() {
        window.addEventListener("keydown", (e) => {
            this.keysDown[e.key.toLowerCase()] = true;
        });
        window.addEventListener("keyup", (e) => {
            this.keysDown[e.key.toLowerCase()] = false;
        });
    }
    /**
     * Player 1 movement via WASD keys.
     * W=-Z, S=+Z, A=-X, D=+X. Rotates to face movement direction.
     */
    setupPlayerMovement() {
        if (!this.scene)
            return;
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "playerMovement", () => {
            if (this.playerEntities.length === 0)
                return;
            const player = this.playerEntities[0];
            let dx = 0, dz = 0;
            if (this.keysDown["w"])
                dz -= PLAYER_SPEED;
            if (this.keysDown["s"])
                dz += PLAYER_SPEED;
            if (this.keysDown["a"])
                dx -= PLAYER_SPEED;
            if (this.keysDown["d"])
                dx += PLAYER_SPEED;
            if (dx !== 0 || dz !== 0) {
                // Normalize diagonal movement
                if (dx !== 0 && dz !== 0) {
                    const len = Math.sqrt(dx * dx + dz * dz);
                    dx = (dx / len) * PLAYER_SPEED;
                    dz = (dz / len) * PLAYER_SPEED;
                }
                player.translateTo(player._translate.x + dx, player._translate.y, player._translate.z + dz);
                // Rotate player to face movement direction.
                // After -π/2 X rotation the model's forward is -Z at Y=0.
                // Compensate with +π/2 for the engine's rotation order.
                const angle = Math.atan2(-dx, -dz) + Math.PI / 2;
                player.rotateTo(-Math.PI / 2, angle, 0);
            }
        });
    }
    /**
     * Update viewport positions and sizes when the window is resized.
     */
    updateViewportLayout() {
        const canvasW = instance_1.ige.engine._bounds2d.x;
        const canvasH = instance_1.ige.engine._bounds2d.y;
        const halfW = Math.floor(canvasW / 2);
        const halfH = Math.floor(canvasH / 2);
        const vpConfigs = [
            { x: 0, y: halfH },
            { x: halfW, y: halfH },
            { x: 0, y: 0 },
            { x: halfW, y: 0 }
        ];
        for (let i = 0; i < this.viewports.length; i++) {
            const vp = this.viewports[i];
            vp._bounds2d.x = halfW;
            vp._bounds2d.y = halfH;
            vp._translate.x = vpConfigs[i].x;
            vp._translate.y = vpConfigs[i].y;
        }
    }
    // --- UI Helpers ---
    updateStatus(status) {
        const el = document.getElementById("status");
        if (el)
            el.textContent = status;
    }
    updatePlayerCount(count) {
        const el = document.getElementById("playerCount");
        if (el)
            el.textContent = count.toString();
    }
    updateStats() {
        const fpsEl = document.getElementById("fps");
        if (fpsEl)
            fpsEl.textContent = Math.round(instance_1.ige.engine._fps).toString();
    }
    hideLoadingScreen() {
        document.querySelectorAll(".igeLoading").forEach(el => {
            el.style.display = "none";
        });
    }
}
exports.Client = Client;
