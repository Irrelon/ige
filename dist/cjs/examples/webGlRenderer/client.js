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
const IgeTexture_1 = require("../../engine/core/IgeTexture.js");
const IgeWebGlRenderer_1 = require("../../engine/core/IgeWebGlRenderer.js");
const IgeViewport_1 = require("../../engine/core/IgeViewport.js");
const instance_1 = require("../../engine/instance.js");
const enums_1 = require("../../enums/index.js");
const IgeWebGlLight_1 = require("../../engine/webgl/IgeWebGlLight.js");
const IgePrimitiveGeometry_1 = require("../../engine/webgl/IgePrimitiveGeometry.js");
const IgeGltfLoader_1 = require("../../engine/webgl/IgeGltfLoader.js");
// @ts-ignore
window.ige = instance_1.ige;
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        this.entities = [];
        this.cubeEntities = [];
        this.rotationSpeeds = [];
        this.isPerspective = true;
        this.lightingEnabled = true;
        this.duckEntities = [];
        this.cameraAnimationEnabled = true;
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Initializing WebGL Renderer Test...");
            try {
                // Update status
                this.updateStatus("Loading textures...");
                // Load test textures
                const fairyTexture = new IgeTexture_1.IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");
                // Wait for textures to load
                yield instance_1.ige.textures.whenLoaded();
                this.log("Textures loaded successfully");
                // Create WebGL renderer
                this.updateStatus("Creating WebGL renderer...");
                this.renderer = new IgeWebGlRenderer_1.IgeWebGlRenderer();
                instance_1.ige.engine.renderer(this.renderer);
                // Setup renderer
                yield this.renderer.setup();
                this.renderer.createFrontBuffer(true);
                this.log("WebGL renderer created and initialized");
                this.updateStatus("Starting engine...");
                // Start the engine
                yield instance_1.ige.engine.start();
                this.log("Engine started");
                // Setup scene
                this.updateStatus("Creating scene...");
                this.setupScene();
                // Setup lights
                this.updateStatus("Setting up lights...");
                this.setupLights();
                // Create test entities (2D sprites)
                this.updateStatus("Creating entities...");
                this.createTestEntities();
                // Create 3D cubes to demonstrate lighting
                this.updateStatus("Creating 3D cubes...");
                this.create3DEntities();
                // Load GLTF model
                this.updateStatus("Loading GLTF model...");
                yield this.loadGltfModel();
                // Setup camera animation
                this.setupCameraAnimation();
                // Setup keyboard controls for camera mode toggle
                this.setupKeyboardControls();
                // Hide loading screen
                this.hideLoadingScreen();
                this.updateStatus("Perspective + Lighting - P/O/L/1/2/3/4");
                this.log("WebGL Renderer test initialized successfully!");
                // Start stats update
                setInterval(() => this.updateStats(), 100);
            }
            catch (error) {
                this.log(`Error initializing: ${error}`, "error");
                this.updateStatus(`Error: ${error}`);
            }
        });
    }
    setupScene() {
        // Create scene
        this.scene = new IgeScene2d_1.IgeScene2d();
        this.scene.id("mainScene");
        // Create viewport (camera is automatically created)
        this.viewport = new IgeViewport_1.IgeViewport();
        this.viewport
            .id("mainViewport")
            .autoSize(true)
            .scene(this.scene);
        // Get the camera from the viewport
        this.camera = this.viewport.camera;
        // Setup 3D camera properties
        this.camera.projectionType("perspective");
        this.camera.fov(60);
        this.camera.near(0.1);
        this.camera.far(1000);
        // Set orthoSize for when switching to orthographic mode
        // This controls the visible height in world units
        this.camera.orthoSize(600);
        this.camera.translateTo(0, 0, 300);
        // Mount viewport to engine
        this.viewport.mount(instance_1.ige.engine);
        this.log("Scene, camera, and viewport created");
    }
    setupLights() {
        if (!this.scene || !this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager) {
            this.log("Light manager not available", "warning");
            return;
        }
        // Create ambient light - provides base illumination
        this.ambientLight = new IgeWebGlLight_1.IgeAmbientLight();
        this.ambientLight.id("ambientLight");
        this.ambientLight.lightColor(0.4, 0.4, 0.5); // Slight blue tint
        this.ambientLight.intensity(0.5); // Increased for better visibility
        this.ambientLight.mount(this.scene);
        lightManager.addLight(this.ambientLight);
        this.log("Ambient light created");
        // Create directional light - simulates sun
        this.directionalLight = new IgeWebGlLight_1.IgeDirectionalLight();
        this.directionalLight.id("directionalLight");
        this.directionalLight.lightColor(1.0, 0.95, 0.8); // Warm white
        this.directionalLight.intensity(1.2); // Increased intensity
        this.directionalLight.direction(-0.3, -0.8, -0.5); // Better angle for cubes
        this.directionalLight.shadowBias(0.005); // Set shadow bias to reduce shadow acne
        this.directionalLight.mount(this.scene);
        lightManager.addLight(this.directionalLight);
        this.log("Directional light created");
        // Enable shadows for the directional light (disabled for now - debugging)
        // if (this.renderer.enableShadows(this.directionalLight, 1024)) {
        // 	this.log("Shadows enabled (1024x1024 shadow map)");
        // }
        // Create point light - orbiting light source
        this.pointLight = new IgeWebGlLight_1.IgePointLight();
        this.pointLight.id("pointLight");
        this.pointLight.lightColor(0.2, 0.5, 1.0); // Blue color
        this.pointLight.intensity(1.5);
        this.pointLight.range(300);
        this.pointLight.decay(2);
        this.pointLight.translateTo(150, 0, 100);
        this.pointLight.mount(this.scene);
        lightManager.addLight(this.pointLight);
        this.log("Point light created");
        // Animate the point light position
        let lightAngle = 0;
        const lightRadius = 200;
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animatePointLight", () => {
            if (!this.pointLight)
                return;
            lightAngle += 0.01;
            const lx = Math.cos(lightAngle) * lightRadius;
            const lz = Math.sin(lightAngle) * lightRadius;
            this.pointLight.translateTo(lx, 50, lz);
        });
        this.log(`Lights setup complete: ${lightManager.getLightCount().total} lights active`);
    }
    createTestEntities() {
        if (!this.scene)
            return;
        const fairyTexture = instance_1.ige.textures.get("fairy");
        if (!fairyTexture) {
            this.log("Fairy texture not found!", "error");
            return;
        }
        // Create a grid of sprites
        const gridSize = 5;
        const spacing = 100;
        const offset = (gridSize - 1) * spacing / 2;
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const entity = new IgeEntity_1.IgeEntity();
                entity
                    .id(`sprite_${x}_${y}`)
                    .texture(fairyTexture)
                    .width(80)
                    .height(80)
                    .translateTo(x * spacing - offset, y * spacing - offset, 0)
                    .mount(this.scene);
                // Add some variation
                entity.opacity(0.7 + Math.random() * 0.3);
                // Store entity and rotation speed for animation
                this.entities.push(entity);
                this.rotationSpeeds.push((Math.random() - 0.5) * 0.02);
            }
        }
        this.log(`Created ${this.entities.length} test entities`);
        // Add update behavior to animate entities
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animateSprites", (scene) => {
            this.entities.forEach((entity, index) => {
                // Rotate entity
                const currentRotation = entity._rotate.z;
                const rotationSpeed = this.rotationSpeeds[index];
                entity.rotateTo(0, 0, currentRotation + rotationSpeed);
                // Animate z position
                const time = Date.now() / 1000;
                const zOffset = Math.sin(time + index * 0.5) * 50;
                entity.translateTo(entity._translate.x, entity._translate.y, zOffset);
            });
        });
    }
    create3DEntities() {
        if (!this.scene)
            return;
        // Create cube geometry
        const cubeGeometry = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createCube(60, "shared_cube");
        // Create a row of cubes with different colors
        const cubeColors = [
            { r: 1.0, g: 0.3, b: 0.3 }, // Red
            { r: 0.3, g: 1.0, b: 0.3 }, // Green
            { r: 0.3, g: 0.3, b: 1.0 }, // Blue
            { r: 1.0, g: 1.0, b: 0.3 }, // Yellow
            { r: 1.0, g: 0.3, b: 1.0 }, // Magenta
        ];
        const spacing = 120;
        const startX = -((cubeColors.length - 1) * spacing) / 2;
        for (let i = 0; i < cubeColors.length; i++) {
            const cube = new IgeEntity_1.IgeEntity();
            cube.id(`cube_${i}`);
            // Set geometry data for 3D rendering
            cube._geometryData = Object.assign(Object.assign({}, cubeGeometry), { id: `cube_geometry_${i}` });
            // Set material data with color for lighting
            cube._materialData = {
                color: { r: cubeColors[i].r, g: cubeColors[i].g, b: cubeColors[i].b, a: 1 },
                metallic: 0.1,
                roughness: 0.6
            };
            // Position the cube in the scene (below the sprites)
            cube.translateTo(startX + i * spacing, -150, 0);
            cube.mount(this.scene);
            this.cubeEntities.push(cube);
        }
        this.log(`Created ${this.cubeEntities.length} 3D cube entities`);
        // Animate cube rotations
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animateCubes", () => {
            const time = Date.now() / 1000;
            this.cubeEntities.forEach((cube, index) => {
                // Rotate each cube differently
                const rotX = time * (0.5 + index * 0.1);
                const rotY = time * (0.3 + index * 0.15);
                cube.rotateTo(rotX, rotY, 0);
            });
        });
    }
    loadGltfModel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.scene)
                return;
            try {
                // Load the Duck model
                this.log("Loading Duck.glb model...");
                this.duckModel = yield IgeGltfLoader_1.igeGltfLoader.load("../../assets/models/Duck.glb", "duck");
                this.log(`Loaded model: ${this.duckModel.name} with ${this.duckModel.meshes.length} meshes`);
                // Create duck entities from the model
                for (let i = 0; i < 3; i++) {
                    const duck = new IgeEntity_1.IgeEntity();
                    duck.id(`duck_${i}`);
                    // Get geometry from first mesh primitive
                    if (this.duckModel.meshes.length > 0 && this.duckModel.meshes[0].primitives.length > 0) {
                        const primitive = this.duckModel.meshes[0].primitives[0];
                        duck._geometryData = Object.assign(Object.assign({}, primitive.geometry), { id: `duck_geometry_${i}` });
                        // Apply bright yellow material for visibility
                        duck._materialData = {
                            color: { r: 1.0, g: 0.9, b: 0.0, a: 1 }, // Bright yellow
                            metallic: 0.0,
                            roughness: 0.3
                        };
                    }
                    // Position ducks in a row above the scene
                    // Duck model from Khronos is large (~200 units), scale down significantly
                    duck.translateTo(-200 + i * 200, 200, 0);
                    duck.scaleTo(0.3, 0.3, 0.3); // Scale down to fit scene
                    duck.mount(this.scene);
                    this.duckEntities.push(duck);
                }
                this.log(`Created ${this.duckEntities.length} duck entities from GLTF model`);
                // Animate duck rotations
                this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animateDucks", () => {
                    const time = Date.now() / 1000;
                    this.duckEntities.forEach((duck, index) => {
                        const rotY = time * (0.5 + index * 0.2);
                        duck.rotateTo(0, rotY, 0);
                    });
                });
            }
            catch (error) {
                this.log(`Failed to load GLTF model: ${error}`, "error");
            }
        });
    }
    setupCameraAnimation() {
        if (!this.camera)
            return;
        // Slowly rotate camera around the scene
        let angle = 0;
        const radius = 300;
        const animateCamera = () => {
            // Only animate if animation is enabled (perspective mode)
            if (this.cameraAnimationEnabled && this.camera) {
                angle += 0.002;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;
                this.camera.translateTo(x, 0, z);
            }
            requestAnimationFrame(animateCamera);
        };
        animateCamera();
        this.log("Camera animation started");
    }
    setupKeyboardControls() {
        window.addEventListener("keydown", (event) => {
            if (!this.camera)
                return;
            switch (event.key.toLowerCase()) {
                case "p":
                    // Switch to perspective mode (re-enable camera animation)
                    this.camera.projectionType("perspective");
                    this.camera._lookAt = undefined; // Clear lookAt to use default
                    this.isPerspective = true;
                    this.cameraAnimationEnabled = true; // Re-enable orbiting
                    this.updateStatus("Perspective Mode (Orbiting) - P/O/L/1/2/3/4");
                    this.log("Switched to perspective camera mode");
                    break;
                case "o":
                    // Switch to orthographic mode (re-enable camera animation)
                    this.camera.projectionType("orthographic");
                    this.camera._lookAt = undefined; // Clear lookAt to use default
                    this.isPerspective = false;
                    this.cameraAnimationEnabled = true; // Re-enable orbiting
                    this.updateStatus("Orthographic Mode (Orbiting) - P/O/L/1/2/3/4");
                    this.log("Switched to orthographic camera mode");
                    break;
                case "1":
                    // Isometric preset - disable animation
                    this.cameraAnimationEnabled = false;
                    this.camera.preset("isometric", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Isometric Preset - P/O/L/1/2/3/4");
                    this.log("Applied isometric camera preset");
                    break;
                case "2":
                    // Isometric 45° preset - disable animation
                    this.cameraAnimationEnabled = false;
                    this.camera.preset("isometric45", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Isometric 45° Preset - P/O/L/1/2/3/4");
                    this.log("Applied isometric 45° camera preset");
                    break;
                case "3":
                    // Top-down preset - disable animation
                    this.cameraAnimationEnabled = false;
                    this.camera.preset("topDown", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Top-Down Preset - P/O/L/1/2/3/4");
                    this.log("Applied top-down camera preset");
                    break;
                case "4":
                    // Side-scroller preset - disable animation
                    this.cameraAnimationEnabled = false;
                    this.camera.preset("sideScroller", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Side-Scroller Preset - P/O/L/1/2/3/4");
                    this.log("Applied side-scroller camera preset");
                    break;
                case "arrowup":
                    // Increase orthoSize (zoom out in ortho mode)
                    if (!this.isPerspective) {
                        const currentSize = this.camera.orthoSize();
                        this.camera.orthoSize(currentSize + 50);
                        this.log(`Ortho size: ${this.camera.orthoSize()}`);
                    }
                    break;
                case "arrowdown":
                    // Decrease orthoSize (zoom in in ortho mode)
                    if (!this.isPerspective) {
                        const currentSize = this.camera.orthoSize();
                        this.camera.orthoSize(Math.max(100, currentSize - 50));
                        this.log(`Ortho size: ${this.camera.orthoSize()}`);
                    }
                    break;
                case "l":
                    // Toggle lighting
                    this.toggleLighting();
                    break;
                case "s":
                    // Toggle shadows
                    this.toggleShadows();
                    break;
                case "d":
                    // Cycle shadow debug mode
                    this.cycleShadowDebugMode();
                    break;
            }
        });
        this.log("Controls: P=Perspective, O=Orthographic, L=Toggle Lighting, S=Toggle Shadows, D=Debug Shadows, 1-4=Presets");
    }
    toggleShadows() {
        if (!this.renderer || !this.directionalLight)
            return;
        if (this.renderer.shadowsEnabled()) {
            this.renderer.disableShadows();
            this.updateStatus("Shadows Disabled - Press S to enable");
            this.log("Shadows disabled");
        }
        else {
            if (this.renderer.enableShadows(this.directionalLight, 1024)) {
                this.updateStatus("Shadows Enabled - Press S to disable");
                this.log("Shadows enabled");
            }
        }
    }
    cycleShadowDebugMode() {
        if (!this.renderer)
            return;
        const debugModes = [
            "Normal Rendering",
            "Debug: UV Coords (RG)",
            "Debug: Fragment Depth",
            "Debug: Shadow Map Depth",
            "Debug: Comparison (R=shadow, G=lit)"
        ];
        const currentMode = this.renderer.shadowDebugMode();
        const nextMode = (currentMode + 1) % debugModes.length;
        this.renderer.shadowDebugMode(nextMode);
        this.updateStatus(`Shadow ${debugModes[nextMode]}`);
        this.log(`Shadow debug mode: ${nextMode} - ${debugModes[nextMode]}`);
    }
    toggleLighting() {
        if (!this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        this.lightingEnabled = !this.lightingEnabled;
        if (this.lightingEnabled) {
            // Re-add lights
            if (this.ambientLight)
                lightManager.addLight(this.ambientLight);
            if (this.directionalLight)
                lightManager.addLight(this.directionalLight);
            if (this.pointLight)
                lightManager.addLight(this.pointLight);
            this.updateStatus(`Lighting ON - ${lightManager.getLightCount().total} lights`);
            this.log("Lighting enabled");
        }
        else {
            // Remove lights
            if (this.ambientLight)
                lightManager.removeLight(this.ambientLight);
            if (this.directionalLight)
                lightManager.removeLight(this.directionalLight);
            if (this.pointLight)
                lightManager.removeLight(this.pointLight);
            this.updateStatus("Lighting OFF - Press L to enable");
            this.log("Lighting disabled");
        }
    }
    updateStatus(status) {
        const statusElement = document.getElementById("status");
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    updateStats() {
        // Update FPS
        const fpsElement = document.getElementById("fps");
        if (fpsElement) {
            fpsElement.textContent = Math.round(instance_1.ige.engine._fps).toString();
        }
        // Update entity count
        const entitiesElement = document.getElementById("entities");
        if (entitiesElement) {
            entitiesElement.textContent = this.entities.length.toString();
        }
        // Update draw calls (placeholder for now)
        const drawCallsElement = document.getElementById("drawCalls");
        if (drawCallsElement) {
            drawCallsElement.textContent = "~" + Math.ceil(this.entities.length / 10).toString();
        }
    }
    hideLoadingScreen() {
        const loadingElements = document.querySelectorAll(".igeLoading");
        loadingElements.forEach(element => {
            element.style.display = "none";
        });
    }
}
exports.Client = Client;
