import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeTexture } from "../../engine/core/IgeTexture.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import { ige } from "../../engine/instance.js"
import { IgeBehaviourType } from "../../enums/index.js";
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    classId = "Client";
    scene;
    camera;
    viewport;
    entities = [];
    rotationSpeeds = [];
    isPerspective = true;
    constructor() {
        super();
        void this.init();
    }
    async init() {
        this.log("Initializing WebGL Renderer Test...");
        try {
            // Update status
            this.updateStatus("Loading textures...");
            // Load test textures
            const fairyTexture = new IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");
            // Wait for textures to load
            await ige.textures.whenLoaded();
            this.log("Textures loaded successfully");
            // Create WebGL renderer
            this.updateStatus("Creating WebGL renderer...");
            const renderer = new IgeWebGlRenderer();
            ige.engine.renderer(renderer);
            // Setup renderer
            await renderer.setup();
            renderer.createFrontBuffer(true);
            this.log("WebGL renderer created and initialized");
            this.updateStatus("Starting engine...");
            // Start the engine
            await ige.engine.start();
            this.log("Engine started");
            // Setup scene
            this.updateStatus("Creating scene...");
            this.setupScene();
            // Create test entities
            this.updateStatus("Creating entities...");
            this.createTestEntities();
            // Setup camera animation
            this.setupCameraAnimation();
            // Setup keyboard controls for camera mode toggle
            this.setupKeyboardControls();
            // Hide loading screen
            this.hideLoadingScreen();
            this.updateStatus("Perspective Mode - P/O/1/2/3/4");
            this.log("WebGL Renderer test initialized successfully!");
            // Start stats update
            setInterval(() => this.updateStats(), 100);
        }
        catch (error) {
            this.log(`Error initializing: ${error}`, "error");
            this.updateStatus(`Error: ${error}`);
        }
    }
    setupScene() {
        // Create scene
        this.scene = new IgeScene2d();
        this.scene.id("mainScene");
        // Create viewport (camera is automatically created)
        this.viewport = new IgeViewport();
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
        this.viewport.mount(ige.engine);
        this.log("Scene, camera, and viewport created");
    }
    createTestEntities() {
        if (!this.scene)
            return;
        const fairyTexture = ige.textures.get("fairy");
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
                const entity = new IgeEntity();
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
        this.scene.addBehaviour(IgeBehaviourType.preUpdate, "animateSprites", (scene) => {
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
    setupCameraAnimation() {
        if (!this.camera)
            return;
        // Slowly rotate camera around the scene
        let angle = 0;
        const radius = 300;
        const animateCamera = () => {
            angle += 0.002;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            if (this.camera) {
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
                    this.updateStatus("Perspective Mode - P/O/1/2/3/4");
                    this.log("Switched to perspective camera mode");
                    break;
                case "o":
                    // Switch to orthographic mode
                    this.camera.projectionType("orthographic");
                    this.isPerspective = false;
                    this.updateStatus("Orthographic Mode - P/O/1/2/3/4");
                    this.log("Switched to orthographic camera mode");
                    break;
                case "1":
                    // Isometric preset
                    this.camera.preset("isometric", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Isometric Preset - P/O/1/2/3/4");
                    this.log("Applied isometric camera preset");
                    break;
                case "2":
                    // Isometric 45° preset
                    this.camera.preset("isometric45", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Isometric 45° Preset - P/O/1/2/3/4");
                    this.log("Applied isometric 45° camera preset");
                    break;
                case "3":
                    // Top-down preset
                    this.camera.preset("topDown", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Top-Down Preset - P/O/1/2/3/4");
                    this.log("Applied top-down camera preset");
                    break;
                case "4":
                    // Side-scroller preset
                    this.camera.preset("sideScroller", 500);
                    this.camera.orthoSize(600);
                    this.isPerspective = false;
                    this.updateStatus("Side-Scroller Preset - P/O/1/2/3/4");
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
            }
        });
        this.log("Controls: P=Perspective, O=Orthographic, 1=Isometric, 2=Iso45, 3=TopDown, 4=SideScroller");
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
            fpsElement.textContent = Math.round(ige.engine._fps).toString();
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
