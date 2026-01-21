import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import { ige } from "../../engine/instance.js"
import { IgeAmbientLight, IgeDirectionalLight } from "../../engine/webgl/IgeWebGlLight.js"
import { igeGltfLoader } from "../../engine/webgl/IgeGltfLoader.js"
import { IgeSkeletalAnimationComponent } from "../../engine/components/IgeSkeletalAnimationComponent.js"
// @ts-ignore
window.ige = ige;
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
export class Client extends IgeBaseClass {
    classId = "Client";
    scene;
    camera;
    viewport;
    renderer;
    ambientLight;
    directionalLight;
    animatedModel;
    animatedEntity;
    animationNames = [];
    constructor() {
        super();
        void this.init();
    }
    async init() {
        this.log("Initializing Skeletal Animation Test...");
        try {
            this.updateStatus("Creating WebGL renderer...");
            // Create WebGL renderer
            this.renderer = new IgeWebGlRenderer();
            ige.engine.renderer(this.renderer);
            // Setup renderer
            await this.renderer.setup();
            this.renderer.createFrontBuffer(true);
            this.log("WebGL renderer created and initialized");
            this.updateStatus("Starting engine...");
            // Start the engine
            await ige.engine.start();
            this.log("Engine started");
            // Setup scene
            this.updateStatus("Creating scene...");
            this.setupScene();
            // Setup lights
            this.updateStatus("Setting up lights...");
            this.setupLights();
            // Load animated model
            this.updateStatus("Loading animated model...");
            await this.loadAnimatedModel();
            // Setup camera animation
            this.setupCameraAnimation();
            // Setup keyboard controls
            this.setupKeyboardControls();
            // Hide loading screen
            this.hideLoadingScreen();
            this.updateStatus("Ready - Press 1-5 for animations");
            this.log("Skeletal Animation test initialized!");
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
        // Create viewport
        this.viewport = new IgeViewport();
        this.viewport
            .id("mainViewport")
            .autoSize(true)
            .scene(this.scene);
        // Get camera
        this.camera = this.viewport.camera;
        // Setup 3D camera
        this.camera.projectionType("perspective");
        this.camera.fov(60);
        this.camera.near(0.1);
        this.camera.far(1000);
        this.camera.translateTo(0, 100, 300);
        // Mount viewport
        this.viewport.mount(ige.engine);
        this.log("Scene created");
    }
    setupLights() {
        if (!this.scene || !this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        // Ambient light
        this.ambientLight = new IgeAmbientLight();
        this.ambientLight.id("ambientLight");
        this.ambientLight.lightColor(0.4, 0.4, 0.5);
        this.ambientLight.intensity(0.6);
        this.ambientLight.mount(this.scene);
        lightManager.addLight(this.ambientLight);
        // Directional light
        this.directionalLight = new IgeDirectionalLight();
        this.directionalLight.id("directionalLight");
        this.directionalLight.lightColor(1.0, 0.95, 0.8);
        this.directionalLight.intensity(1.5);
        this.directionalLight.direction(-0.3, -0.8, -0.5);
        this.directionalLight.mount(this.scene);
        lightManager.addLight(this.directionalLight);
        this.log("Lights setup complete");
    }
    async loadAnimatedModel() {
        if (!this.scene || !this.renderer)
            return;
        try {
            // IMPORTANT: Replace this path with your animated GLTF model
            // The model should have:
            // - A skeleton (armature) with bones
            // - At least one animation clip
            // - Mesh with skinning weights (JOINTS_0, WEIGHTS_0)
            const modelPath = "../../assets/models/CesiumMan.glb";
            this.log(`Loading animated model from: ${modelPath}`);
            this.animatedModel = await igeGltfLoader.load(modelPath, "animatedModel");
            this.log(`Model loaded: ${this.animatedModel.name}`);
            this.log(`  Meshes: ${this.animatedModel.meshes.length}`);
            this.log(`  Skins: ${this.animatedModel.skins?.length || 0}`);
            this.log(`  Animations: ${this.animatedModel.animations?.length || 0}`);
            this.log(`  Images: ${this.animatedModel.images?.length || 0}`);
            this.log(`  Textures: ${this.animatedModel.textures?.length || 0}`);
            // Preload textures from materials
            await this.preloadTextures();
            // Check if model has skeleton and animations
            if (!this.animatedModel.skins || this.animatedModel.skins.length === 0) {
                this.log("Warning: Model has no skeleton (skin) data!", "warning");
                this.updateStatus("Warning: No skeleton in model");
            }
            if (!this.animatedModel.animations || this.animatedModel.animations.length === 0) {
                this.log("Warning: Model has no animation data!", "warning");
                this.updateStatus("Warning: No animations in model");
            }
            // Create entity from model
            this.createAnimatedEntity();
        }
        catch (error) {
            this.log(`Failed to load animated model: ${error}`, "error");
            this.updateStatus("Failed to load model - check console");
            // Create a placeholder message
            this.log("\n======================================");
            this.log("To test skeletal animation:");
            this.log("1. Download an animated GLTF model");
            this.log("2. Place it in: assets/models/CesiumMan.glb");
            this.log("3. Refresh this page");
            this.log("\nRecommended test models:");
            this.log("- CesiumMan.glb from glTF-Sample-Models");
            this.log("- RiggedSimple.glb from glTF-Sample-Models");
            this.log("- Any animated character from Mixamo (export as FBX, convert via Blender)");
            this.log("======================================\n");
        }
    }
    async preloadTextures() {
        if (!this.renderer || !this.animatedModel)
            return;
        const textureManager = this.renderer._textureManager;
        if (!textureManager) {
            this.log("Texture manager not available", "warning");
            return;
        }
        // Load textures from materials
        for (let i = 0; i < this.animatedModel.materials.length; i++) {
            const material = this.animatedModel.materials[i];
            const textureData = material._baseColorTextureData;
            if (textureData) {
                const textureId = `material_${i}_baseColor`;
                this.log(`Loading texture for material ${i}...`);
                await textureManager.createTextureFromBlob(textureId, textureData);
                // Store the texture ID on the material for later reference
                material._baseColorTextureId = textureId;
            }
        }
        this.log("Texture preloading complete");
    }
    createAnimatedEntity() {
        if (!this.scene || !this.renderer || !this.animatedModel)
            return;
        const skeletonManager = this.renderer.skeletonManager;
        if (!skeletonManager) {
            this.log("Skeleton manager not available", "error");
            return;
        }
        // Create entity
        this.animatedEntity = new IgeEntity();
        this.animatedEntity.id("cesiumMan");
        // Get first mesh with skinning
        const mesh = this.animatedModel.meshes.find(m => m.primitives.some(p => p.geometry.boneWeights && p.geometry.boneIndices));
        if (!mesh) {
            this.log("No skinned mesh found in model", "warning");
            // Fallback to first mesh
            if (this.animatedModel.meshes.length > 0) {
                const firstMesh = this.animatedModel.meshes[0];
                if (firstMesh.primitives.length > 0) {
                    this.animatedEntity._geometryData = {
                        ...firstMesh.primitives[0].geometry,
                        id: "animatedCharacter_geometry"
                    };
                }
            }
        }
        else {
            // Use skinned mesh
            const primitive = mesh.primitives.find(p => p.geometry.boneWeights && p.geometry.boneIndices);
            if (primitive) {
                this.animatedEntity._geometryData = {
                    ...primitive.geometry,
                    id: "animatedCharacter_geometry"
                };
                const vertexCount = (primitive.geometry.vertices?.length || 0) / 3;
                this.log(`Using skinned mesh with ${vertexCount} vertices`);
                this.log(`  Has boneWeights: ${!!primitive.geometry.boneWeights}`);
                this.log(`  Has boneIndices: ${!!primitive.geometry.boneIndices}`);
                this.log(`  Has normals: ${!!primitive.geometry.normals}`);
                this.log(`  Has uvs: ${!!primitive.geometry.uvs}`);
                this.log(`  Has indices: ${!!primitive.geometry.indices}`);
                this.log(`  SkeletonId: ${primitive.geometry.skeletonId}`);
            }
        }
        // Set material - use the GLTF material if available
        const gltfMaterial = this.animatedModel.materials[0];
        if (gltfMaterial && gltfMaterial._baseColorTextureId) {
            // Use GLTF material with texture reference
            this.animatedEntity._materialData = {
                color: gltfMaterial._color || { r: 1, g: 1, b: 1, a: 1 },
                metallic: gltfMaterial._metallic ?? 0.0,
                roughness: gltfMaterial._roughness ?? 0.5,
                textureId: gltfMaterial._baseColorTextureId
            };
            this.log(`Using GLTF material with texture: ${gltfMaterial._baseColorTextureId}`);
        }
        else {
            // Fallback to default material
            this.animatedEntity._materialData = {
                color: { r: 0.9, g: 0.8, b: 0.7, a: 1 },
                metallic: 0.0,
                roughness: 0.5
            };
            this.log("Using default material (no texture)");
        }
        // Register skeleton data if available
        if (this.animatedModel.skins && this.animatedModel.skins.length > 0) {
            const skin = this.animatedModel.skins[0];
            skeletonManager.registerSkeletonData(skin.skeleton);
            this.log(`Registered skeleton: ${skin.skeleton.name} with ${skin.skeleton.boneCount} bones`);
            // Update bone count display
            const boneCountEl = document.getElementById("boneCount");
            if (boneCountEl) {
                boneCountEl.textContent = skin.skeleton.boneCount.toString();
            }
            // Create skeleton instance for this entity
            const skeletonInstance = skeletonManager.createSkeletonInstance(skin.skeleton.id, "animatedCharacter_skeleton");
            if (skeletonInstance) {
                this.animatedEntity._skeleton = skeletonInstance;
                this.log("Created skeleton instance for entity");
            }
        }
        // Add skeletal animation component
        this.animatedEntity.addComponent("skeletalAnimation", IgeSkeletalAnimationComponent);
        const animComponent = this.animatedEntity.components.skeletalAnimation;
        // Set skeleton reference for animation component
        if (this.animatedEntity._skeleton) {
            animComponent.setSkeleton(this.animatedEntity._skeleton);
        }
        // Register animation clips
        if (this.animatedModel.animations && this.animatedModel.animations.length > 0) {
            for (const clip of this.animatedModel.animations) {
                animComponent.define(clip.id, clip);
                this.animationNames.push(clip.name || clip.id);
                this.log(`Registered animation: ${clip.name} (duration: ${clip.duration.toFixed(2)}s)`);
            }
            // Auto-play first animation
            if (this.animationNames.length > 0) {
                const firstAnimId = this.animatedModel.animations[0].id;
                animComponent.play(firstAnimId, { crossFadeDuration: 0 });
                this.updateAnimationDisplay(this.animationNames[0]);
            }
        }
        // Position and scale entity
        // CesiumMan is about 1.8m (180 units) tall, scale up to be visible
        this.animatedEntity.translateTo(0, -100, 0); // Lower to center in view
        this.animatedEntity.scaleTo(100, 100, 100); // Scale up for visibility
        // Mount to scene
        this.animatedEntity.mount(this.scene);
        this.log("Animated entity created and mounted");
    }
    setupCameraAnimation() {
        if (!this.camera)
            return;
        // Slowly orbit camera around the model
        let angle = 0;
        const radius = 400; // Increased for scaled model
        const height = 50; // Eye level
        const animateCamera = () => {
            if (this.camera) {
                angle += 0.003;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;
                this.camera.translateTo(x, height, z);
            }
            requestAnimationFrame(animateCamera);
        };
        animateCamera();
    }
    setupKeyboardControls() {
        window.addEventListener("keydown", (event) => {
            if (!this.animatedEntity)
                return;
            const animComponent = this.animatedEntity.components.skeletalAnimation;
            if (!animComponent)
                return;
            switch (event.key) {
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                    // Play animation by number
                    const index = parseInt(event.key) - 1;
                    if (this.animatedModel?.animations && index < this.animatedModel.animations.length) {
                        const clip = this.animatedModel.animations[index];
                        animComponent.play(clip.id, { crossFadeDuration: 0.3 });
                        this.updateAnimationDisplay(clip.name || clip.id);
                        this.log(`Playing animation: ${clip.name}`);
                    }
                    break;
                case " ":
                    // Stop animation
                    animComponent.stop();
                    this.updateAnimationDisplay("Stopped");
                    break;
                case "p":
                    // Perspective mode
                    if (this.camera) {
                        this.camera.projectionType("perspective");
                        this.log("Switched to perspective");
                    }
                    break;
                case "o":
                    // Orthographic mode
                    if (this.camera) {
                        this.camera.projectionType("orthographic");
                        this.camera.orthoSize(400);
                        this.log("Switched to orthographic");
                    }
                    break;
            }
        });
        this.log("Keyboard controls setup: 1-5=animations, Space=stop, P/O=camera");
    }
    updateAnimationDisplay(animName) {
        const el = document.getElementById("currentAnimation");
        if (el) {
            el.textContent = animName;
        }
    }
    updateStatus(status) {
        const el = document.getElementById("status");
        if (el) {
            el.textContent = status;
        }
    }
    updateStats() {
        const fpsEl = document.getElementById("fps");
        if (fpsEl) {
            fpsEl.textContent = Math.round(ige.engine._fps).toString();
        }
    }
    hideLoadingScreen() {
        const loadingElements = document.querySelectorAll(".igeLoading");
        loadingElements.forEach(element => {
            element.style.display = "none";
        });
    }
}
