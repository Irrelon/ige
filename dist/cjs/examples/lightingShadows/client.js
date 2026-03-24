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
const IgePrimitiveGeometry_1 = require("../../engine/webgl/IgePrimitiveGeometry.js");
const IgeGltfLoader_1 = require("../../engine/webgl/IgeGltfLoader.js");
const IgeSkeletalAnimationComponent_1 = require("../../engine/components/IgeSkeletalAnimationComponent.js");
// @ts-ignore
window.ige = instance_1.ige;
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
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        this.greenOrbitAngleOffset = 0;
        this.greenOrbitPaused = false;
        this.lightingEnabled = true;
        this.lampPostEntities = [];
        this.animationNames = [];
        this.sceneEntities = [];
        // Animation state
        this.swingAngle = 0;
        this.swingSpeed = 1.5;
        this.orbitAngleOffset = 0;
        this.orbitPaused = false;
        this.cameraAngleOffset = 0.5;
        this.cameraPaused = false;
        this.cameraOrbitRadius = 500;
        this.cameraOrbitHeight = 250;
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Initializing Lighting & Shadows Example...");
            try {
                this.updateStatus("Creating WebGL renderer...");
                // Create WebGL renderer
                this.renderer = new IgeWebGlRenderer_1.IgeWebGlRenderer();
                instance_1.ige.engine.renderer(this.renderer);
                yield this.renderer.setup();
                this.renderer.createFrontBuffer(true);
                this.updateStatus("Starting engine...");
                yield instance_1.ige.engine.start();
                // Setup scene
                this.updateStatus("Creating scene...");
                this.setupScene();
                // Setup lights
                this.updateStatus("Setting up lights...");
                this.setupLights();
                // Create scene geometry (ground, lamp post, props)
                this.updateStatus("Building scene...");
                this.createSceneGeometry();
                // Load animated model
                this.updateStatus("Loading animated model...");
                yield this.loadAnimatedModel();
                // Setup animation behaviours
                this.setupAnimations();
                // Setup keyboard controls
                this.setupKeyboardControls();
                // Build light control GUI
                this.buildLightGUI();
                // Hide loading screen
                this.hideLoadingScreen();
                this.updateStatus("Ready");
                this.log("Lighting & Shadows example initialized!");
                setInterval(() => this.updateStats(), 100);
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
        this.viewport = new IgeViewport_1.IgeViewport();
        this.viewport
            .id("mainViewport")
            .autoSize(true)
            .scene(this.scene);
        this.camera = this.viewport.camera;
        // Setup 3D perspective camera
        this.camera.projectionType("perspective");
        this.camera.fov(50);
        this.camera.near(0.1);
        this.camera.far(2000);
        this.camera.orthoSize(600);
        // Position camera for a nice overview of the scene
        this.camera.translateTo(300, 200, 400);
        this.camera._lookAt = new IgePoint3d_1.IgePoint3d(0, 0, 0);
        this.viewport.mount(instance_1.ige.engine);
    }
    setupLights() {
        if (!this.scene || !this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        // Use R32F for point shadow atlases (better precision, no banding on curved surfaces)
        if (this.renderer.shadowManager) {
            this.renderer.shadowManager.pointShadowFormat("r32f");
        }
        // --- Ambient light: dim nighttime ambience ---
        this.ambientLight = new IgeWebGlLight_1.IgeAmbientLight();
        this.ambientLight.id("ambientLight");
        this.ambientLight.lightColor(0.08, 0.08, 0.15); // Very dark blue
        this.ambientLight.intensity(1.0);
        this.ambientLight.mount(this.scene);
        lightManager.addLight(this.ambientLight);
        // --- Moonlight: directional light casting shadows ---
        this.moonLight = new IgeWebGlLight_1.IgeDirectionalLight();
        this.moonLight.id("moonLight");
        this.moonLight.lightColor(0.6, 0.65, 0.9); // Cool blue-white moonlight
        this.moonLight.intensity(0.4);
        this.moonLight.direction(-0.3, -0.8, -0.4);
        this.moonLight.shadowBias(0.0);
        this.moonLight.mount(this.scene);
        lightManager.addLight(this.moonLight);
        // Enable shadows from moonlight
        if (this.renderer.enableShadows(this.moonLight, 2048)) {
            this.log("Shadows enabled (2048x2048 shadow map)");
            this.updateShadowStatus("On");
        }
        // --- Street lamp: spot light pointing down ---
        this.streetLampLight = new IgeWebGlLight_1.IgeSpotLight();
        this.streetLampLight.id("streetLampLight");
        this.streetLampLight.lightColor(1.0, 0.85, 0.5); // Warm sodium-vapour orange
        this.streetLampLight.intensity(1.5);
        this.streetLampLight.direction(0, -1, 0); // Pointing straight down
        this.streetLampLight.angleDegrees(40);
        this.streetLampLight.penumbra(0.4);
        this.streetLampLight.range(400);
        this.streetLampLight.decay(2);
        // Position at the top of the lamp post
        this.streetLampLight.translateTo(-150, 200, -50);
        this.streetLampLight.mount(this.scene);
        lightManager.addLight(this.streetLampLight);
        // --- Swinging light: point light that swings like a pendulum ---
        this.swingingLight = new IgeWebGlLight_1.IgePointLight();
        this.swingingLight.id("swingingLight");
        this.swingingLight.lightColor(0.9, 0.95, 1.0); // Cool white
        this.swingingLight.intensity(1.2);
        this.swingingLight.range(250);
        this.swingingLight.decay(2);
        // Start position (will be animated)
        this.swingingLight.translateTo(100, 120, 50);
        this.swingingLight.mount(this.scene);
        lightManager.addLight(this.swingingLight);
        // Enable point light shadows for the swinging light
        if (this.renderer.enablePointLightShadows(this.swingingLight, 512)) {
            this.log("Point light shadows enabled for swinging light (6x 1024x1024)");
        }
        // --- Single orbiting red point light ---
        this.orbitLight = new IgeWebGlLight_1.IgePointLight();
        this.orbitLight.id("orbitLight");
        this.orbitLight.lightColor(1.0, 0.2, 0.2);
        this.orbitLight.intensity(0.6);
        this.orbitLight.range(200);
        this.orbitLight.decay(2);
        this.orbitLight.translateTo(200, 100, 0);
        this.orbitLight.mount(this.scene);
        lightManager.addLight(this.orbitLight);
        // Enable point light shadows for the orbit light
        if (this.renderer.enablePointLightShadows(this.orbitLight, 512)) {
            this.log("Point light shadows enabled for orbit light");
        }
        // Visual bulb
        const orbitBulbGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createSphere(5, 8, 8, "orbit_bulb");
        this.orbitBulb = new IgeEntity_1.IgeEntity();
        this.orbitBulb.id("orbitBulb");
        this.orbitBulb._geometryData = Object.assign(Object.assign({}, orbitBulbGeom), { id: "orbit_bulb_geom" });
        this.orbitBulb._materialData = {
            color: { r: 1.0, g: 0.2, b: 0.2, a: 1 },
            metallic: 0.0,
            roughness: 0.1,
            emissiveColor: { r: 1.0, g: 0.2, b: 0.2 },
            emissiveIntensity: 3.0
        };
        this.orbitBulb.translateTo(200, 100, 0);
        this.orbitBulb._noShadowCast = true;
        this.orbitBulb.mount(this.scene);
        // --- Green orbiting point light (wider, lower orbit) ---
        this.greenOrbitLight = new IgeWebGlLight_1.IgePointLight();
        this.greenOrbitLight.id("greenOrbitLight");
        this.greenOrbitLight.lightColor(0.2, 1.0, 0.3);
        this.greenOrbitLight.intensity(0.6);
        this.greenOrbitLight.range(250);
        this.greenOrbitLight.decay(2);
        this.greenOrbitLight.translateTo(350, 40, 0);
        this.greenOrbitLight.mount(this.scene);
        lightManager.addLight(this.greenOrbitLight);
        // Visual bulb
        const greenBulbGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createSphere(5, 8, 8, "green_orbit_bulb");
        this.greenOrbitBulb = new IgeEntity_1.IgeEntity();
        this.greenOrbitBulb.id("greenOrbitBulb");
        this.greenOrbitBulb._geometryData = Object.assign(Object.assign({}, greenBulbGeom), { id: "green_orbit_bulb_geom" });
        this.greenOrbitBulb._materialData = {
            color: { r: 0.2, g: 1.0, b: 0.3, a: 1 },
            metallic: 0.0,
            roughness: 0.1,
            emissiveColor: { r: 0.2, g: 1.0, b: 0.3 },
            emissiveIntensity: 3.0
        };
        this.greenOrbitBulb.translateTo(350, 40, 0);
        this.greenOrbitBulb._noShadowCast = true;
        this.greenOrbitBulb.mount(this.scene);
        this.updateLightCount();
        this.log(`Lights created: ${lightManager.getLightCount().total} total`);
    }
    /**
     * Generate a cylinder geometry for the lamp post.
     */
    createCylinderGeometry(radiusTop, radiusBottom, height, segments, id) {
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const halfHeight = height / 2;
        // Side vertices
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);
            const u = i / segments;
            // Bottom ring
            vertices.push(radiusBottom * cosT, -halfHeight, radiusBottom * sinT);
            normals.push(cosT, 0, sinT);
            uvs.push(u, 0);
            // Top ring
            vertices.push(radiusTop * cosT, halfHeight, radiusTop * sinT);
            normals.push(cosT, 0, sinT);
            uvs.push(u, 1);
        }
        // Side indices
        for (let i = 0; i < segments; i++) {
            const b = i * 2;
            indices.push(b, b + 1, b + 3);
            indices.push(b, b + 3, b + 2);
        }
        // Top cap
        const topCenterIdx = vertices.length / 3;
        vertices.push(0, halfHeight, 0);
        normals.push(0, 1, 0);
        uvs.push(0.5, 0.5);
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            vertices.push(radiusTop * Math.cos(theta), halfHeight, radiusTop * Math.sin(theta));
            normals.push(0, 1, 0);
            uvs.push(0.5 + 0.5 * Math.cos(theta), 0.5 + 0.5 * Math.sin(theta));
        }
        for (let i = 0; i < segments; i++) {
            indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 2 + i);
        }
        // Bottom cap
        const botCenterIdx = vertices.length / 3;
        vertices.push(0, -halfHeight, 0);
        normals.push(0, -1, 0);
        uvs.push(0.5, 0.5);
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            vertices.push(radiusBottom * Math.cos(theta), -halfHeight, radiusBottom * Math.sin(theta));
            normals.push(0, -1, 0);
            uvs.push(0.5 + 0.5 * Math.cos(theta), 0.5 + 0.5 * Math.sin(theta));
        }
        for (let i = 0; i < segments; i++) {
            indices.push(botCenterIdx, botCenterIdx + 2 + i, botCenterIdx + 1 + i);
        }
        return {
            id,
            type: "primitive",
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint16Array(indices)
        };
    }
    createSceneGeometry() {
        if (!this.scene)
            return;
        // --- Ground plane ---
        const groundGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createPlane(800, 800, "ground_plane");
        this.groundEntity = new IgeEntity_1.IgeEntity();
        this.groundEntity.id("ground");
        this.groundEntity._geometryData = Object.assign(Object.assign({}, groundGeom), { id: "ground_geom" });
        this.groundEntity._materialData = {
            color: { r: 0.15, g: 0.15, b: 0.18, a: 1 },
            metallic: 0.0,
            roughness: 0.9
        };
        // Rotate plane to be horizontal (it's created in XY, we need XZ)
        this.groundEntity.rotateTo(-Math.PI / 2, 0, 0);
        this.groundEntity.translateTo(0, 0, 0);
        this.groundEntity.mount(this.scene);
        // --- Street lamp post ---
        const lampX = -150;
        const lampZ = -50;
        // Lamp pole (tall thin cylinder)
        const poleGeom = this.createCylinderGeometry(3, 4, 190, 8, "lamp_pole");
        const pole = new IgeEntity_1.IgeEntity();
        pole.id("lampPole");
        pole._geometryData = Object.assign(Object.assign({}, poleGeom), { id: "lamp_pole_geom" });
        pole._materialData = {
            color: { r: 0.25, g: 0.25, b: 0.28, a: 1 },
            metallic: 0.7,
            roughness: 0.3
        };
        pole.translateTo(lampX, 95, lampZ);
        pole.mount(this.scene);
        this.lampPostEntities.push(pole);
        // Lamp head (wider cylinder at top)
        const headGeom = this.createCylinderGeometry(12, 8, 15, 8, "lamp_head");
        const head = new IgeEntity_1.IgeEntity();
        head.id("lampHead");
        head._geometryData = Object.assign(Object.assign({}, headGeom), { id: "lamp_head_geom" });
        head._materialData = {
            color: { r: 0.3, g: 0.3, b: 0.33, a: 1 },
            metallic: 0.6,
            roughness: 0.3
        };
        head.translateTo(lampX, 197, lampZ);
        head.mount(this.scene);
        this.lampPostEntities.push(head);
        // Lamp bulb glow (small bright sphere at the light position)
        const bulbGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createSphere(5, 8, 8, "lamp_bulb");
        const bulb = new IgeEntity_1.IgeEntity();
        bulb.id("lampBulb");
        bulb._geometryData = Object.assign(Object.assign({}, bulbGeom), { id: "lamp_bulb_geom" });
        bulb._materialData = {
            color: { r: 1.0, g: 0.9, b: 0.5, a: 1 },
            metallic: 0.0,
            roughness: 0.1,
            emissiveColor: { r: 1.0, g: 0.85, b: 0.5 },
            emissiveIntensity: 2.0
        };
        bulb.translateTo(lampX, 192, lampZ);
        bulb._noShadowCast = true;
        bulb.mount(this.scene);
        this.lampPostEntities.push(bulb);
        // --- Swinging light fixture ---
        // A ceiling mount point (small cube to hang from)
        const mountGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createCube(10, "swing_mount");
        const mount = new IgeEntity_1.IgeEntity();
        mount.id("swingMount");
        mount._geometryData = Object.assign(Object.assign({}, mountGeom), { id: "swing_mount_geom" });
        mount._materialData = {
            color: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
            metallic: 0.5,
            roughness: 0.4
        };
        mount.translateTo(100, 200, 50);
        mount.mount(this.scene);
        this.sceneEntities.push(mount);
        // The swinging light bulb visual
        const swingBulbGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createSphere(6, 8, 8, "swing_bulb");
        this.swingingLightEntity = new IgeEntity_1.IgeEntity();
        this.swingingLightEntity.id("swingBulb");
        this.swingingLightEntity._geometryData = Object.assign(Object.assign({}, swingBulbGeom), { id: "swing_bulb_geom" });
        this.swingingLightEntity._materialData = {
            color: { r: 0.9, g: 0.95, b: 1.0, a: 1 },
            metallic: 0.0,
            roughness: 0.1,
            emissiveColor: { r: 0.9, g: 0.95, b: 1.0 },
            emissiveIntensity: 2.0
        };
        this.swingingLightEntity.translateTo(100, 120, 50);
        this.swingingLightEntity._noShadowCast = true;
        this.swingingLightEntity.mount(this.scene);
        // --- Scene props: crates/boxes to cast and receive shadows ---
        const crateGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createCube(40, "crate");
        const cratePositions = [
            { x: -60, z: 80 },
            { x: 50, z: -80 },
            { x: 180, z: 30 }
        ];
        const crateColors = [
            { r: 0.55, g: 0.35, b: 0.2 }, // Wood brown
            { r: 0.45, g: 0.3, b: 0.18 }, // Dark wood
            { r: 0.5, g: 0.32, b: 0.2 } // Medium wood
        ];
        cratePositions.forEach((pos, i) => {
            const crate = new IgeEntity_1.IgeEntity();
            crate.id(`crate_${i}`);
            crate._geometryData = Object.assign(Object.assign({}, crateGeom), { id: `crate_geom_${i}` });
            crate._materialData = {
                color: Object.assign(Object.assign({}, crateColors[i]), { a: 1 }),
                metallic: 0.0,
                roughness: 0.8
            };
            crate.translateTo(pos.x, 20, pos.z);
            // Slight rotation for visual interest
            crate.rotateTo(0, (i * 0.4) + 0.2, 0);
            crate.mount(this.scene);
            this.sceneEntities.push(crate);
        });
        // A couple of stacked smaller crates
        const smallCrateGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createCube(25, "small_crate");
        const stackCrate = new IgeEntity_1.IgeEntity();
        stackCrate.id("stackCrate");
        stackCrate._geometryData = Object.assign(Object.assign({}, smallCrateGeom), { id: "stack_crate_geom" });
        stackCrate._materialData = {
            color: { r: 0.5, g: 0.35, b: 0.2, a: 1 },
            metallic: 0.0,
            roughness: 0.85
        };
        stackCrate.translateTo(-60, 52, 80);
        stackCrate.rotateTo(0, 0.6, 0);
        stackCrate.mount(this.scene);
        this.sceneEntities.push(stackCrate);
        // A metallic sphere to show reflective lighting
        const sphereGeom = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createSphere(20, 16, 16, "metal_sphere");
        const sphere = new IgeEntity_1.IgeEntity();
        sphere.id("metalSphere");
        sphere._geometryData = Object.assign(Object.assign({}, sphereGeom), { id: "metal_sphere_geom" });
        sphere._materialData = {
            color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
            metallic: 0.9,
            roughness: 0.1
        };
        sphere.translateTo(-80, 20, -60);
        sphere.mount(this.scene);
        this.sceneEntities.push(sphere);
        this.log("Scene geometry created");
    }
    loadAnimatedModel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.scene || !this.renderer)
                return;
            try {
                const modelPath = "../../assets/models/CesiumMan.glb";
                this.animatedModel = yield IgeGltfLoader_1.igeGltfLoader.load(modelPath, "cesiumMan");
                this.log(`Model loaded: ${this.animatedModel.name}`);
                // Preload textures from materials
                yield this.preloadTextures();
                this.createAnimatedEntity();
            }
            catch (error) {
                this.log(`Failed to load animated model: ${error}`, "error");
                this.updateStatus("Model load failed - scene still works");
            }
        });
    }
    preloadTextures() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.renderer || !this.animatedModel)
                return;
            const textureManager = this.renderer._textureManager;
            if (!textureManager)
                return;
            for (let i = 0; i < this.animatedModel.materials.length; i++) {
                const material = this.animatedModel.materials[i];
                const textureData = material._baseColorTextureData;
                if (textureData) {
                    const textureId = `material_${i}_baseColor`;
                    yield textureManager.createTextureFromBlob(textureId, textureData);
                    material._baseColorTextureId = textureId;
                }
            }
        });
    }
    createAnimatedEntity() {
        var _a, _b;
        if (!this.scene || !this.renderer || !this.animatedModel)
            return;
        const skeletonManager = this.renderer.skeletonManager;
        if (!skeletonManager)
            return;
        this.animatedEntity = new IgeEntity_1.IgeEntity();
        this.animatedEntity.id("cesiumMan");
        // Get skinned mesh
        const mesh = this.animatedModel.meshes.find(m => m.primitives.some(p => p.geometry.boneWeights && p.geometry.boneIndices));
        if (mesh) {
            const primitive = mesh.primitives.find(p => p.geometry.boneWeights && p.geometry.boneIndices);
            if (primitive) {
                this.animatedEntity._geometryData = Object.assign(Object.assign({}, primitive.geometry), { id: "cesiumMan_geometry" });
            }
        }
        // Material
        const gltfMaterial = this.animatedModel.materials[0];
        if (gltfMaterial && gltfMaterial._baseColorTextureId) {
            this.animatedEntity._materialData = {
                color: gltfMaterial._color || { r: 1, g: 1, b: 1, a: 1 },
                metallic: (_a = gltfMaterial._metallic) !== null && _a !== void 0 ? _a : 0.0,
                roughness: (_b = gltfMaterial._roughness) !== null && _b !== void 0 ? _b : 0.5,
                textureId: gltfMaterial._baseColorTextureId
            };
        }
        else {
            this.animatedEntity._materialData = {
                color: { r: 0.9, g: 0.8, b: 0.7, a: 1 },
                metallic: 0.0,
                roughness: 0.5
            };
        }
        // Skeleton
        if (this.animatedModel.skins && this.animatedModel.skins.length > 0) {
            const skin = this.animatedModel.skins[0];
            skeletonManager.registerSkeletonData(skin.skeleton);
            const skeletonInstance = skeletonManager.createSkeletonInstance(skin.skeleton.id, "cesiumMan_skeleton");
            if (skeletonInstance) {
                this.animatedEntity._skeleton = skeletonInstance;
            }
        }
        // Animation component
        this.animatedEntity.addComponent("skeletalAnimation", IgeSkeletalAnimationComponent_1.IgeSkeletalAnimationComponent);
        const animComponent = this.animatedEntity.components.skeletalAnimation;
        if (this.animatedEntity._skeleton) {
            animComponent.setSkeleton(this.animatedEntity._skeleton);
        }
        // Register and play animations
        if (this.animatedModel.animations && this.animatedModel.animations.length > 0) {
            for (const clip of this.animatedModel.animations) {
                animComponent.define(clip.id, clip);
                this.animationNames.push(clip.name || clip.id);
            }
            // Auto-play first animation
            const firstClip = this.animatedModel.animations[0];
            animComponent.play(firstClip.id, { crossFadeDuration: 0 });
        }
        // Position the character in the centre of the scene, on the ground
        // CesiumMan is Z-up, about 1.8 units tall; scale to ~180 world units
        this.animatedEntity.translateTo(0, 0, 0);
        this.animatedEntity.scaleTo(100, 100, 100);
        this.animatedEntity.rotateTo(-Math.PI / 2, Math.PI, 0);
        this.animatedEntity.mount(this.scene);
        this.log("Animated character placed in scene");
    }
    setupAnimations() {
        if (!this.scene)
            return;
        // --- Swinging light pendulum animation ---
        const swingPivotX = 100;
        const swingPivotY = 200; // Ceiling mount height
        const swingPivotZ = 50;
        const cordLength = 80; // Length of the cord
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animateSwingingLight", () => {
            // Pendulum physics: angle = maxAngle * cos(speed * time)
            const time = instance_1.ige.engine._currentTime / 1000;
            const maxAngle = Math.PI / 5; // ~36 degree swing
            this.swingAngle = maxAngle * Math.cos(this.swingSpeed * time);
            // Calculate pendulum position
            const offsetX = Math.sin(this.swingAngle) * cordLength;
            const offsetY = -Math.cos(this.swingAngle) * cordLength;
            const lightX = swingPivotX + offsetX;
            const lightY = swingPivotY + offsetY;
            const lightZ = swingPivotZ;
            // Update light position
            if (this.swingingLight) {
                this.swingingLight.translateTo(lightX, lightY, lightZ);
            }
            // Update visual bulb position
            if (this.swingingLightEntity) {
                this.swingingLightEntity.translateTo(lightX, lightY, lightZ);
            }
        });
        // --- Orbiting red light ---
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animateOrbitLight", () => {
            const time = instance_1.ige.engine._currentTime / 1000;
            const angle = this.orbitPaused
                ? this.orbitAngleOffset
                : time * 0.5 + this.orbitAngleOffset;
            const x = Math.cos(angle) * 200;
            const z = Math.sin(angle) * 200;
            if (this.orbitLight) {
                this.orbitLight.translateTo(x, 100, z);
            }
            if (this.orbitBulb) {
                this.orbitBulb.translateTo(x, 100, z);
            }
        });
        // --- Orbiting green light (wider, lower) ---
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animateGreenOrbitLight", () => {
            const time = instance_1.ige.engine._currentTime / 1000;
            const angle = this.greenOrbitPaused
                ? this.greenOrbitAngleOffset
                : time * 0.3 + this.greenOrbitAngleOffset;
            const x = Math.cos(angle) * 350;
            const z = Math.sin(angle) * 350;
            if (this.greenOrbitLight) {
                this.greenOrbitLight.translateTo(x, 40, z);
            }
            if (this.greenOrbitBulb) {
                this.greenOrbitBulb.translateTo(x, 40, z);
            }
        });
        // --- Slow camera orbit ---
        this.scene.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animateCamera", () => {
            if (!this.camera)
                return;
            const time = instance_1.ige.engine._currentTime / 1000;
            const angle = this.cameraPaused
                ? this.cameraAngleOffset
                : time * 0.1 + this.cameraAngleOffset;
            const cx = Math.sin(angle) * this.cameraOrbitRadius;
            const cz = Math.cos(angle) * this.cameraOrbitRadius;
            this.camera.translateTo(cx, this.cameraOrbitHeight, cz);
        });
    }
    setupKeyboardControls() {
        // Pause/resume button
        const pauseBtn = document.getElementById("pauseBtn");
        let paused = false;
        if (pauseBtn) {
            pauseBtn.addEventListener("click", () => {
                paused = !paused;
                if (paused) {
                    instance_1.ige.engine.stop();
                    pauseBtn.textContent = "Resume";
                    pauseBtn.classList.remove("on");
                    pauseBtn.classList.add("off");
                }
                else {
                    instance_1.ige.engine.start();
                    pauseBtn.textContent = "Pause";
                    pauseBtn.classList.remove("off");
                    pauseBtn.classList.add("on");
                }
            });
        }
        window.addEventListener("keydown", (event) => {
            switch (event.key.toLowerCase()) {
                case "s":
                    this.toggleShadows();
                    break;
                case "d":
                    this.cycleShadowDebugMode();
                    break;
                case "l":
                    this.toggleAllLights();
                    break;
                case "1":
                    this.toggleLight(this.streetLampLight, "Street lamp");
                    break;
                case "2":
                    this.toggleLight(this.swingingLight, "Swinging light");
                    break;
                case "3":
                    this.toggleLight(this.moonLight, "Moonlight");
                    break;
                case "p":
                    if (this.camera) {
                        this.camera.projectionType("perspective");
                        this.log("Perspective mode");
                    }
                    break;
                case "o":
                    if (this.camera) {
                        this.camera.projectionType("orthographic");
                        this.camera.orthoSize(600);
                        this.log("Orthographic mode");
                    }
                    break;
                case "arrowup":
                    if (this.camera) {
                        const size = this.camera.orthoSize();
                        this.camera.orthoSize(Math.max(100, size - 50));
                    }
                    break;
                case "arrowdown":
                    if (this.camera) {
                        const size = this.camera.orthoSize();
                        this.camera.orthoSize(size + 50);
                    }
                    break;
            }
        });
    }
    toggleShadows() {
        if (!this.renderer || !this.moonLight)
            return;
        if (this.renderer.shadowsEnabled()) {
            this.renderer.disableShadows();
            this.updateShadowStatus("Off");
            this.log("Shadows disabled");
        }
        else {
            if (this.renderer.enableShadows(this.moonLight, 2048)) {
                this.updateShadowStatus("On");
                this.log("Shadows enabled");
            }
        }
    }
    cycleShadowDebugMode() {
        if (!this.renderer)
            return;
        const modes = [
            "Normal",
            "UV Coords",
            "Fragment Depth",
            "Shadow Map Depth",
            "Comparison"
        ];
        const current = this.renderer.shadowDebugMode();
        const next = (current + 1) % modes.length;
        this.renderer.shadowDebugMode(next);
        this.updateShadowStatus(next === 0 ? "On" : `Debug: ${modes[next]}`);
    }
    toggleLight(light, name) {
        if (!this.renderer || !light)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        // Check if light is currently tracked by trying to remove and re-add
        // The light manager tracks lights internally, so we toggle by remove/add
        lightManager.removeLight(light);
        // Check light counts to see if removal worked (hacky but works with current API)
        // Instead, we'll use a simple flag on the light
        const flagKey = "_userDisabled";
        if (light[flagKey]) {
            lightManager.addLight(light);
            light[flagKey] = false;
            this.log(`${name}: ON`);
        }
        else {
            // We already removed it above
            light[flagKey] = true;
            this.log(`${name}: OFF`);
        }
        this.updateLightCount();
    }
    toggleAllLights() {
        if (!this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        this.lightingEnabled = !this.lightingEnabled;
        const allLights = [this.ambientLight, this.moonLight, this.streetLampLight, this.swingingLight];
        if (this.lightingEnabled) {
            allLights.forEach(light => {
                if (light) {
                    lightManager.addLight(light);
                    light._userDisabled = false;
                }
            });
            this.log("All lights ON");
        }
        else {
            allLights.forEach(light => {
                if (light) {
                    lightManager.removeLight(light);
                    light._userDisabled = true;
                }
            });
            this.log("All lights OFF");
        }
        this.updateLightCount();
    }
    buildLightGUI() {
        const container = document.getElementById("lightControls");
        if (!container || !this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        const lights = [
            { name: "Ambient", color: "#8888cc", light: this.ambientLight, hasIntensity: true, hasRange: false, maxIntensity: 10, maxRange: 0 },
            { name: "Moonlight", color: "#99aadd", light: this.moonLight, hasIntensity: true, hasRange: false, maxIntensity: 10, maxRange: 0 },
            { name: "Street Lamp", color: "#ffcc66", light: this.streetLampLight, hasIntensity: true, hasRange: true, maxIntensity: 10, maxRange: 2000 },
            { name: "Swinging", color: "#eeeeff", light: this.swingingLight, hasIntensity: true, hasRange: true, maxIntensity: 10, maxRange: 2000 },
            { name: "Red Orbit", color: "#ff4444", light: this.orbitLight, hasIntensity: true, hasRange: true, maxIntensity: 10, maxRange: 2000 },
            { name: "Green Orbit", color: "#44ff66", light: this.greenOrbitLight, hasIntensity: true, hasRange: true, maxIntensity: 10, maxRange: 2000 }
        ];
        for (const def of lights) {
            if (!def.light)
                continue;
            const group = document.createElement("div");
            group.className = "light-group";
            // Header with name and toggle
            const header = document.createElement("div");
            header.className = "light-header";
            const nameSpan = document.createElement("span");
            nameSpan.className = "light-name";
            nameSpan.style.color = def.color;
            nameSpan.textContent = def.name;
            header.appendChild(nameSpan);
            const toggleBtn = document.createElement("button");
            toggleBtn.className = "toggle-btn on";
            toggleBtn.textContent = "ON";
            toggleBtn.addEventListener("click", () => {
                const isOn = toggleBtn.classList.contains("on");
                if (isOn) {
                    lightManager.removeLight(def.light);
                    toggleBtn.classList.remove("on");
                    toggleBtn.classList.add("off");
                    toggleBtn.textContent = "OFF";
                }
                else {
                    lightManager.addLight(def.light);
                    toggleBtn.classList.remove("off");
                    toggleBtn.classList.add("on");
                    toggleBtn.textContent = "ON";
                }
                this.updateLightCount();
            });
            header.appendChild(toggleBtn);
            group.appendChild(header);
            // Intensity slider
            if (def.hasIntensity) {
                const currentIntensity = def.light.intensity();
                const label = document.createElement("label");
                label.textContent = "Intensity ";
                const slider = document.createElement("input");
                slider.type = "range";
                slider.min = "0";
                slider.max = String(def.maxIntensity);
                slider.step = "0.05";
                slider.value = String(currentIntensity);
                const valueSpan = document.createElement("span");
                valueSpan.className = "value";
                valueSpan.textContent = currentIntensity.toFixed(2);
                slider.addEventListener("input", () => {
                    const val = parseFloat(slider.value);
                    def.light.intensity(val);
                    valueSpan.textContent = val.toFixed(2);
                });
                label.appendChild(slider);
                label.appendChild(valueSpan);
                group.appendChild(label);
            }
            // Range slider
            if (def.hasRange) {
                const currentRange = (def.light.range ? def.light.range() : 0);
                const label = document.createElement("label");
                label.textContent = "Range     ";
                const slider = document.createElement("input");
                slider.type = "range";
                slider.min = "0";
                slider.max = String(def.maxRange);
                slider.step = "5";
                slider.value = String(currentRange);
                const valueSpan = document.createElement("span");
                valueSpan.className = "value";
                valueSpan.textContent = String(Math.round(currentRange));
                slider.addEventListener("input", () => {
                    const val = parseFloat(slider.value);
                    if (def.light.range)
                        def.light.range(val);
                    valueSpan.textContent = String(Math.round(val));
                });
                label.appendChild(slider);
                label.appendChild(valueSpan);
                group.appendChild(label);
            }
            container.appendChild(group);
        }
        // Orbit position control
        const orbitGroup = document.createElement("div");
        orbitGroup.className = "light-group";
        const orbitHeader = document.createElement("div");
        orbitHeader.className = "light-header";
        const orbitName = document.createElement("span");
        orbitName.className = "light-name";
        orbitName.style.color = "#ff8844";
        orbitName.textContent = "Orbit Position";
        orbitHeader.appendChild(orbitName);
        const orbitPauseBtn = document.createElement("button");
        orbitPauseBtn.className = "toggle-btn off";
        orbitPauseBtn.textContent = "MANUAL";
        orbitPauseBtn.addEventListener("click", () => {
            this.orbitPaused = !this.orbitPaused;
            if (this.orbitPaused) {
                // Capture current auto angle as the manual starting point
                const time = instance_1.ige.engine._currentTime / 1000;
                this.orbitAngleOffset = time * 0.5 + this.orbitAngleOffset;
                orbitPauseBtn.classList.remove("off");
                orbitPauseBtn.classList.add("on");
                orbitPauseBtn.textContent = "AUTO";
            }
            else {
                // Resume auto: adjust offset so position is continuous
                const time = instance_1.ige.engine._currentTime / 1000;
                this.orbitAngleOffset = this.orbitAngleOffset - time * 0.5;
                orbitPauseBtn.classList.remove("on");
                orbitPauseBtn.classList.add("off");
                orbitPauseBtn.textContent = "MANUAL";
            }
        });
        orbitHeader.appendChild(orbitPauseBtn);
        orbitGroup.appendChild(orbitHeader);
        const orbitLabel = document.createElement("label");
        orbitLabel.textContent = "Angle     ";
        const orbitSlider = document.createElement("input");
        orbitSlider.type = "range";
        orbitSlider.min = "0";
        orbitSlider.max = String(Math.PI * 2);
        orbitSlider.step = "0.01";
        orbitSlider.value = "0";
        const orbitValue = document.createElement("span");
        orbitValue.className = "value";
        orbitValue.textContent = "0°";
        orbitSlider.addEventListener("input", () => {
            const val = parseFloat(orbitSlider.value);
            this.orbitAngleOffset = val;
            orbitValue.textContent = Math.round(val * 180 / Math.PI) + "°";
            // Auto-switch to manual mode when dragging
            if (!this.orbitPaused) {
                this.orbitPaused = true;
                orbitPauseBtn.classList.remove("off");
                orbitPauseBtn.classList.add("on");
                orbitPauseBtn.textContent = "AUTO";
            }
        });
        orbitLabel.appendChild(orbitSlider);
        orbitLabel.appendChild(orbitValue);
        orbitGroup.appendChild(orbitLabel);
        container.appendChild(orbitGroup);
        // Green orbit position control
        const greenOrbitGroup = document.createElement("div");
        greenOrbitGroup.className = "light-group";
        const greenOrbitHeader = document.createElement("div");
        greenOrbitHeader.className = "light-header";
        const greenOrbitName = document.createElement("span");
        greenOrbitName.className = "light-name";
        greenOrbitName.style.color = "#44ff66";
        greenOrbitName.textContent = "Green Orbit Pos";
        greenOrbitHeader.appendChild(greenOrbitName);
        const greenOrbitPauseBtn = document.createElement("button");
        greenOrbitPauseBtn.className = "toggle-btn off";
        greenOrbitPauseBtn.textContent = "MANUAL";
        greenOrbitPauseBtn.addEventListener("click", () => {
            this.greenOrbitPaused = !this.greenOrbitPaused;
            if (this.greenOrbitPaused) {
                const time = instance_1.ige.engine._currentTime / 1000;
                this.greenOrbitAngleOffset = time * 0.3 + this.greenOrbitAngleOffset;
                greenOrbitPauseBtn.classList.remove("off");
                greenOrbitPauseBtn.classList.add("on");
                greenOrbitPauseBtn.textContent = "AUTO";
            }
            else {
                const time = instance_1.ige.engine._currentTime / 1000;
                this.greenOrbitAngleOffset = this.greenOrbitAngleOffset - time * 0.3;
                greenOrbitPauseBtn.classList.remove("on");
                greenOrbitPauseBtn.classList.add("off");
                greenOrbitPauseBtn.textContent = "MANUAL";
            }
        });
        greenOrbitHeader.appendChild(greenOrbitPauseBtn);
        greenOrbitGroup.appendChild(greenOrbitHeader);
        const greenOrbitLabel = document.createElement("label");
        greenOrbitLabel.textContent = "Angle     ";
        const greenOrbitSlider = document.createElement("input");
        greenOrbitSlider.type = "range";
        greenOrbitSlider.min = "0";
        greenOrbitSlider.max = String(Math.PI * 2);
        greenOrbitSlider.step = "0.01";
        greenOrbitSlider.value = "0";
        const greenOrbitValue = document.createElement("span");
        greenOrbitValue.className = "value";
        greenOrbitValue.textContent = "0°";
        greenOrbitSlider.addEventListener("input", () => {
            const val = parseFloat(greenOrbitSlider.value);
            this.greenOrbitAngleOffset = val;
            greenOrbitValue.textContent = Math.round(val * 180 / Math.PI) + "°";
            if (!this.greenOrbitPaused) {
                this.greenOrbitPaused = true;
                greenOrbitPauseBtn.classList.remove("off");
                greenOrbitPauseBtn.classList.add("on");
                greenOrbitPauseBtn.textContent = "AUTO";
            }
        });
        greenOrbitLabel.appendChild(greenOrbitSlider);
        greenOrbitLabel.appendChild(greenOrbitValue);
        greenOrbitGroup.appendChild(greenOrbitLabel);
        container.appendChild(greenOrbitGroup);
        // Camera orbit control
        const camGroup = document.createElement("div");
        camGroup.className = "light-group";
        const camHeader = document.createElement("div");
        camHeader.className = "light-header";
        const camName = document.createElement("span");
        camName.className = "light-name";
        camName.style.color = "#88ccff";
        camName.textContent = "Camera";
        camHeader.appendChild(camName);
        const camPauseBtn = document.createElement("button");
        camPauseBtn.className = "toggle-btn off";
        camPauseBtn.textContent = "MANUAL";
        camPauseBtn.addEventListener("click", () => {
            this.cameraPaused = !this.cameraPaused;
            if (this.cameraPaused) {
                const time = instance_1.ige.engine._currentTime / 1000;
                this.cameraAngleOffset = time * 0.1 + this.cameraAngleOffset;
                camPauseBtn.classList.remove("off");
                camPauseBtn.classList.add("on");
                camPauseBtn.textContent = "AUTO";
            }
            else {
                const time = instance_1.ige.engine._currentTime / 1000;
                this.cameraAngleOffset = this.cameraAngleOffset - time * 0.1;
                camPauseBtn.classList.remove("on");
                camPauseBtn.classList.add("off");
                camPauseBtn.textContent = "MANUAL";
            }
        });
        camHeader.appendChild(camPauseBtn);
        camGroup.appendChild(camHeader);
        // Angle slider
        const camAngleLabel = document.createElement("label");
        camAngleLabel.textContent = "Angle     ";
        const camAngleSlider = document.createElement("input");
        camAngleSlider.type = "range";
        camAngleSlider.min = "0";
        camAngleSlider.max = String(Math.PI * 2);
        camAngleSlider.step = "0.01";
        camAngleSlider.value = String(this.cameraAngleOffset);
        const camAngleValue = document.createElement("span");
        camAngleValue.className = "value";
        camAngleValue.textContent = Math.round(this.cameraAngleOffset * 180 / Math.PI) + "°";
        camAngleSlider.addEventListener("input", () => {
            const val = parseFloat(camAngleSlider.value);
            this.cameraAngleOffset = val;
            camAngleValue.textContent = Math.round(val * 180 / Math.PI) + "°";
            if (!this.cameraPaused) {
                this.cameraPaused = true;
                camPauseBtn.classList.remove("off");
                camPauseBtn.classList.add("on");
                camPauseBtn.textContent = "AUTO";
            }
        });
        camAngleLabel.appendChild(camAngleSlider);
        camAngleLabel.appendChild(camAngleValue);
        camGroup.appendChild(camAngleLabel);
        // Height slider
        const camHeightLabel = document.createElement("label");
        camHeightLabel.textContent = "Height    ";
        const camHeightSlider = document.createElement("input");
        camHeightSlider.type = "range";
        camHeightSlider.min = "10";
        camHeightSlider.max = "600";
        camHeightSlider.step = "5";
        camHeightSlider.value = String(this.cameraOrbitHeight);
        const camHeightValue = document.createElement("span");
        camHeightValue.className = "value";
        camHeightValue.textContent = String(this.cameraOrbitHeight);
        camHeightSlider.addEventListener("input", () => {
            this.cameraOrbitHeight = parseFloat(camHeightSlider.value);
            camHeightValue.textContent = String(Math.round(this.cameraOrbitHeight));
        });
        camHeightLabel.appendChild(camHeightSlider);
        camHeightLabel.appendChild(camHeightValue);
        camGroup.appendChild(camHeightLabel);
        // Distance slider
        const camDistLabel = document.createElement("label");
        camDistLabel.textContent = "Distance  ";
        const camDistSlider = document.createElement("input");
        camDistSlider.type = "range";
        camDistSlider.min = "100";
        camDistSlider.max = "1500";
        camDistSlider.step = "10";
        camDistSlider.value = String(this.cameraOrbitRadius);
        const camDistValue = document.createElement("span");
        camDistValue.className = "value";
        camDistValue.textContent = String(this.cameraOrbitRadius);
        camDistSlider.addEventListener("input", () => {
            this.cameraOrbitRadius = parseFloat(camDistSlider.value);
            camDistValue.textContent = String(Math.round(this.cameraOrbitRadius));
        });
        camDistLabel.appendChild(camDistSlider);
        camDistLabel.appendChild(camDistValue);
        camGroup.appendChild(camDistLabel);
        container.appendChild(camGroup);
    }
    updateLightCount() {
        if (!this.renderer)
            return;
        const lightManager = this.renderer.lightManager;
        if (!lightManager)
            return;
        const el = document.getElementById("lightCount");
        if (el) {
            el.textContent = lightManager.getLightCount().total.toString();
        }
    }
    updateShadowStatus(status) {
        const el = document.getElementById("shadowStatus");
        if (el) {
            el.textContent = status;
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
            fpsEl.textContent = Math.round(instance_1.ige.engine._fps).toString();
        }
        this.updateLightCount();
    }
    hideLoadingScreen() {
        const loadingElements = document.querySelectorAll(".igeLoading");
        loadingElements.forEach(element => {
            element.style.display = "none";
        });
    }
}
exports.Client = Client;
