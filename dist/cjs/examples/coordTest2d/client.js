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
const IgePrimitiveGeometry_1 = require("../../engine/webgl/IgePrimitiveGeometry.js");
const IgeWebGlLight_1 = require("../../engine/webgl/IgeWebGlLight.js");
const coordTestUtils_1 = require("../coordTestUtils");
/**
 * 2D Orthographic Coordinate System Test.
 *
 * Renders colored cubes at known world positions using a front-facing
 * orthographic camera, then reads back pixels to verify that:
 *   +X world = right on screen
 *   +Y world = up on screen (lower pixel Y)
 *   +Z world = toward viewer (in front of other objects)
 */
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.log("Starting 2D orthographic coordinate test...");
            // Create renderer with preserved drawing buffer for readPixels
            const renderer = new IgeWebGlRenderer_1.IgeWebGlRenderer();
            renderer.preserveDrawingBuffer(true);
            instance_1.ige.engine.renderer(renderer);
            // Create front buffer before setup: autoSize=true, dontScale=true (DPR=1)
            renderer.createFrontBuffer(true, true);
            yield renderer.setup();
            // Start engine
            yield instance_1.ige.engine.start();
            // Create scene
            const scene = new IgeScene2d_1.IgeScene2d();
            scene.id("testScene");
            // Create viewport
            const viewport = new IgeViewport_1.IgeViewport();
            viewport
                .id("testViewport")
                .autoSize(true)
                .scene(scene);
            // Configure camera: orthographic, looking down -Z at origin
            const camera = viewport.camera;
            camera.projectionType("orthographic");
            camera.near(0.1);
            camera.far(500);
            // Set orthoSize so that 1 world unit ≈ 1 pixel when canvas is ~400px
            // orthoSize is the full visible height in world units
            // With autoSize, canvas matches window. Use the actual canvas height.
            const canvas = renderer.canvasElement();
            const canvasW = canvas.width;
            const canvasH = canvas.height;
            camera.orthoSize(canvasH);
            // Camera on +Z axis looking at origin (standard front view)
            camera.translateTo(0, 0, 200);
            camera._lookAt = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            viewport.mount(instance_1.ige.engine);
            // Add bright ambient light so cubes are fully lit
            const ambient = new IgeWebGlLight_1.IgeAmbientLight();
            ambient.id("testAmbient");
            ambient.lightColor(1, 1, 1);
            ambient.intensity(1);
            ambient.mount(scene);
            (_a = renderer.lightManager) === null || _a === void 0 ? void 0 : _a.addLight(ambient);
            // Create colored cubes at test positions
            const cubeSize = 20;
            const offset = 80; // distance from center
            const cubeGeometry = IgePrimitiveGeometry_1.IgePrimitiveGeometry.createCube(cubeSize, "test_cube");
            const testEntities = [
                { name: "center (red)", worldPos: new IgePoint3d_1.IgePoint3d(0, 0, 0), color: { r: 1, g: 0, b: 0 } },
                { name: "+X (green)", worldPos: new IgePoint3d_1.IgePoint3d(offset, 0, 0), color: { r: 0, g: 1, b: 0 } },
                { name: "-X (blue)", worldPos: new IgePoint3d_1.IgePoint3d(-offset, 0, 0), color: { r: 0, g: 0, b: 1 } },
                { name: "+Y (yellow)", worldPos: new IgePoint3d_1.IgePoint3d(0, offset, 0), color: { r: 1, g: 1, b: 0 } },
                { name: "-Y (magenta)", worldPos: new IgePoint3d_1.IgePoint3d(0, -offset, 0), color: { r: 1, g: 0, b: 1 } }
            ];
            for (const config of testEntities) {
                const entity = new IgeEntity_1.IgeEntity();
                entity.id(`test_${config.name}`);
                entity._geometryData = Object.assign(Object.assign({}, cubeGeometry), { id: `geom_${config.name}` });
                entity._materialData = {
                    color: { r: config.color.r, g: config.color.g, b: config.color.b, a: 1 },
                    metallic: 0,
                    roughness: 1
                };
                entity.translateTo(config.worldPos.x, config.worldPos.y, config.worldPos.z);
                entity.mount(scene);
            }
            this.log("Entities created. Waiting for render frame...");
            // Wait for two frames to ensure everything is rendered
            yield this._waitFrames(3);
            // Read pixels and run assertions
            this.log("Reading pixels...");
            const pixels = renderer.readAllPixels();
            if (!pixels) {
                this.log("ERROR: Could not read pixels from WebGL context");
                return;
            }
            const results = [];
            // Get camera matrices for computing expected screen positions
            const cameraController = renderer._cameraController;
            const matrices = cameraController.updateCamera(camera, viewport);
            for (const config of testEntities) {
                const screenPos = (0, coordTestUtils_1.worldToScreen)(config.worldPos, matrices.view, matrices.projection, canvasW, canvasH);
                this.log(`${config.name}: world(${config.worldPos.x},${config.worldPos.y},${config.worldPos.z}) -> screen(${screenPos.x.toFixed(1)},${screenPos.y.toFixed(1)})`);
                results.push(Object.assign(Object.assign({}, (0, coordTestUtils_1.assertPixelColor)(pixels, screenPos.x, screenPos.y, canvasW, canvasH, Math.round(config.color.r * 255), Math.round(config.color.g * 255), Math.round(config.color.b * 255), 60)), { name: config.name }));
            }
            // Directional assertions: verify relative positions
            const centerScreen = (0, coordTestUtils_1.worldToScreen)(testEntities[0].worldPos, matrices.view, matrices.projection, canvasW, canvasH);
            const plusXScreen = (0, coordTestUtils_1.worldToScreen)(testEntities[1].worldPos, matrices.view, matrices.projection, canvasW, canvasH);
            const minusXScreen = (0, coordTestUtils_1.worldToScreen)(testEntities[2].worldPos, matrices.view, matrices.projection, canvasW, canvasH);
            const plusYScreen = (0, coordTestUtils_1.worldToScreen)(testEntities[3].worldPos, matrices.view, matrices.projection, canvasW, canvasH);
            const minusYScreen = (0, coordTestUtils_1.worldToScreen)(testEntities[4].worldPos, matrices.view, matrices.projection, canvasW, canvasH);
            // +X should be to the RIGHT of center (higher screen X)
            results.push({
                name: "+X is right of center",
                passed: plusXScreen.x > centerScreen.x,
                expected: `screenX > ${centerScreen.x.toFixed(1)}`,
                actual: `screenX = ${plusXScreen.x.toFixed(1)}`
            });
            // -X should be to the LEFT of center (lower screen X)
            results.push({
                name: "-X is left of center",
                passed: minusXScreen.x < centerScreen.x,
                expected: `screenX < ${centerScreen.x.toFixed(1)}`,
                actual: `screenX = ${minusXScreen.x.toFixed(1)}`
            });
            // +Y should be ABOVE center (lower screen Y in DOM coords)
            results.push({
                name: "+Y is above center (lower screen Y)",
                passed: plusYScreen.y < centerScreen.y,
                expected: `screenY < ${centerScreen.y.toFixed(1)}`,
                actual: `screenY = ${plusYScreen.y.toFixed(1)}`
            });
            // -Y should be BELOW center (higher screen Y in DOM coords)
            results.push({
                name: "-Y is below center (higher screen Y)",
                passed: minusYScreen.y > centerScreen.y,
                expected: `screenY > ${centerScreen.y.toFixed(1)}`,
                actual: `screenY = ${minusYScreen.y.toFixed(1)}`
            });
            (0, coordTestUtils_1.displayResults)(results);
        });
    }
    _waitFrames(count) {
        return new Promise((resolve) => {
            let remaining = count;
            const tick = () => {
                remaining--;
                if (remaining <= 0) {
                    resolve();
                }
                else {
                    requestAnimationFrame(tick);
                }
            };
            requestAnimationFrame(tick);
        });
    }
}
exports.Client = Client;
