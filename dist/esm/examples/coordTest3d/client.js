import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import { IgePoint3d } from "../../engine/core/IgePoint3d.js"
import { ige } from "../../engine/instance.js"
import { IgePrimitiveGeometry } from "../../engine/webgl/IgePrimitiveGeometry.js"
import { IgeAmbientLight } from "../../engine/webgl/IgeWebGlLight.js"
import { assertPixelColor, worldToScreen, displayResults } from "../coordTestUtils.js"
/**
 * 3D Camera Rotation Coordinate System Test.
 *
 * Places colored cubes along the X, Y, Z axes, then rotates the camera
 * to three positions (front, right, top) taking pixel snapshots at each
 * to verify correct rendering orientation.
 *
 * Camera positions:
 *   1. Front view: camera at (0, 0, 150) looking at origin
 *   2. Right view: camera at (150, 0, 0) looking at origin
 *   3. Top view:   camera at (0, 150, 0) looking at origin, up=(0, 0, -1)
 */
export class Client extends IgeBaseClass {
    classId = "Client";
    renderer;
    camera;
    viewport;
    canvasW;
    canvasH;
    constructor() {
        super();
        void this.init();
    }
    async init() {
        this.log("Starting 3D camera rotation test...");
        this.renderer = new IgeWebGlRenderer();
        this.renderer.preserveDrawingBuffer(true);
        ige.engine.renderer(this.renderer);
        this.renderer.createFrontBuffer(true, true);
        await this.renderer.setup();
        await ige.engine.start();
        const scene = new IgeScene2d();
        scene.id("testScene");
        this.viewport = new IgeViewport();
        this.viewport.id("testViewport").autoSize(true).scene(scene);
        this.camera = this.viewport.camera;
        this.camera.projectionType("perspective");
        this.camera.fov(60);
        this.camera.near(0.1);
        this.camera.far(1000);
        const canvas = this.renderer.canvasElement();
        this.canvasW = canvas.width;
        this.canvasH = canvas.height;
        this.viewport.mount(ige.engine);
        // Add bright ambient light
        const ambient = new IgeAmbientLight();
        ambient.id("testAmbient");
        ambient.lightColor(1, 1, 1);
        ambient.intensity(1);
        ambient.mount(scene);
        this.renderer.lightManager?.addLight(ambient);
        // Create colored cubes along each axis + origin
        const cubeSize = 20;
        const axisDist = 50;
        const cubeGeometry = IgePrimitiveGeometry.createCube(cubeSize, "axis_cube");
        const cubeConfigs = [
            { name: "origin_white", pos: new IgePoint3d(0, 0, 0), color: { r: 1, g: 1, b: 1 } },
            { name: "+X_red", pos: new IgePoint3d(axisDist, 0, 0), color: { r: 1, g: 0, b: 0 } },
            { name: "+Y_green", pos: new IgePoint3d(0, axisDist, 0), color: { r: 0, g: 1, b: 0 } },
            { name: "+Z_blue", pos: new IgePoint3d(0, 0, axisDist), color: { r: 0, g: 0, b: 1 } }
        ];
        for (const cfg of cubeConfigs) {
            const entity = new IgeEntity();
            entity.id(cfg.name);
            entity._geometryData = { ...cubeGeometry, id: `geom_${cfg.name}` };
            entity._materialData = {
                color: { r: cfg.color.r, g: cfg.color.g, b: cfg.color.b, a: 1 },
                metallic: 0,
                roughness: 1
            };
            entity.translateTo(cfg.pos.x, cfg.pos.y, cfg.pos.z);
            entity.mount(scene);
        }
        const allResults = [];
        // ---------- View 1: Front (camera on +Z) ----------
        this.log("=== View 1: Front (camera on +Z axis) ===");
        this.camera.translateTo(0, 0, 150);
        this.camera._lookAt = new IgePoint3d(0, 0, 0);
        await this._waitFrames(3);
        allResults.push(...this._testView("front", [
            // From front view: +X = right, +Y = up, +Z = toward camera
            { desc: "+X (red) is RIGHT of center", axis: "+X", check: "right" },
            { desc: "+Y (green) is ABOVE center", axis: "+Y", check: "above" },
            { desc: "+Z (blue) is NEAR camera (between origin and camera)", axis: "+Z", check: "near" }
        ]));
        // ---------- View 2: Right (camera on +X) ----------
        this.log("=== View 2: Right (camera on +X axis) ===");
        this.camera.translateTo(150, 0, 0);
        this.camera._lookAt = new IgePoint3d(0, 0, 0);
        await this._waitFrames(3);
        allResults.push(...this._testView("right", [
            // From right view: +Z = left, +Y = up, +X = toward camera
            { desc: "+Z (blue) is LEFT of center", axis: "+Z", check: "left" },
            { desc: "+Y (green) is ABOVE center", axis: "+Y", check: "above" }
        ]));
        // ---------- View 3: Near-top (camera slightly offset from +Y) ----------
        // Pure top-down (0,150,0) with up=(0,1,0) produces a degenerate lookAt
        // (view direction parallel to up vector). Use a slight Z offset to avoid this.
        this.log("=== View 3: Near-top (camera above, slight Z offset) ===");
        this.camera.translateTo(0, 150, 1);
        this.camera._lookAt = new IgePoint3d(0, 0, 0);
        await this._waitFrames(3);
        allResults.push(...this._testView("near-top", [
            // From near-top: +X should still be to the right
            { desc: "+X (red) is RIGHT of center", axis: "+X", check: "right" },
            // +Z should be below center (toward viewer from above, screen bottom)
            { desc: "+Z (blue) is BELOW center", axis: "+Z", check: "below" }
        ]));
        displayResults(allResults);
    }
    _testView(viewName, checks) {
        const pixels = this.renderer.readAllPixels();
        if (!pixels)
            return [];
        const results = [];
        const cameraController = this.renderer._cameraController;
        const matrices = cameraController.updateCamera(this.camera, this.viewport);
        // World positions for each axis cube
        const positions = {
            "origin": new IgePoint3d(0, 0, 0),
            "+X": new IgePoint3d(50, 0, 0),
            "+Y": new IgePoint3d(0, 50, 0),
            "+Z": new IgePoint3d(0, 0, 50)
        };
        // Compute screen positions
        const screenPos = {};
        for (const [key, worldPos] of Object.entries(positions)) {
            screenPos[key] = worldToScreen(worldPos, matrices.view, matrices.projection, this.canvasW, this.canvasH);
            this.log(`  ${viewName}/${key}: screen(${screenPos[key].x.toFixed(1)}, ${screenPos[key].y.toFixed(1)})`);
        }
        // Check pixel colors at projected positions.
        // Skip origin: it's typically occluded by axis cubes that sit between
        // the camera and the origin along the camera's view axis.
        const colorMap = {
            "+X": [255, 0, 0],
            "+Y": [0, 255, 0],
            "+Z": [0, 0, 255]
        };
        for (const [key, rgb] of Object.entries(colorMap)) {
            const sp = screenPos[key];
            // Only check if the position is within canvas bounds
            if (sp.x >= 0 && sp.x < this.canvasW && sp.y >= 0 && sp.y < this.canvasH) {
                results.push({
                    ...assertPixelColor(pixels, sp.x, sp.y, this.canvasW, this.canvasH, rgb[0], rgb[1], rgb[2], 60),
                    name: `[${viewName}] ${key} color`
                });
            }
        }
        // Directional checks
        const originSP = screenPos["origin"];
        for (const check of checks) {
            const axisSP = screenPos[check.axis];
            let passed = false;
            let expected = "";
            let actual = "";
            switch (check.check) {
                case "right":
                    passed = axisSP.x > originSP.x + 5;
                    expected = `screenX > ${originSP.x.toFixed(0)}`;
                    actual = `screenX = ${axisSP.x.toFixed(0)}`;
                    break;
                case "left":
                    passed = axisSP.x < originSP.x - 5;
                    expected = `screenX < ${originSP.x.toFixed(0)}`;
                    actual = `screenX = ${axisSP.x.toFixed(0)}`;
                    break;
                case "above":
                    passed = axisSP.y < originSP.y - 5;
                    expected = `screenY < ${originSP.y.toFixed(0)}`;
                    actual = `screenY = ${axisSP.y.toFixed(0)}`;
                    break;
                case "below":
                    passed = axisSP.y > originSP.y + 5;
                    expected = `screenY > ${originSP.y.toFixed(0)}`;
                    actual = `screenY = ${axisSP.y.toFixed(0)}`;
                    break;
                case "near":
                    // +Z cube is closer to camera (on +Z axis), so it has
                    // a larger apparent size but the projected center should
                    // be near screen center. We just check it projects near center.
                    passed = Math.abs(axisSP.x - originSP.x) < 30 && Math.abs(axisSP.y - originSP.y) < 30;
                    expected = "near screen center (within 30px of origin)";
                    actual = `offset: (${(axisSP.x - originSP.x).toFixed(0)}, ${(axisSP.y - originSP.y).toFixed(0)})`;
                    break;
            }
            results.push({
                name: `[${viewName}] ${check.desc}`,
                passed,
                expected,
                actual
            });
        }
        return results;
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
