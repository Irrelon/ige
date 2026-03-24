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
 * Isometric Coordinate System Test.
 *
 * Renders colored cubes at known world positions using an orthographic camera
 * at the classic isometric angle (35.264 deg elevation, 45 deg azimuth),
 * then reads back pixels to verify correct screen positions.
 *
 * In isometric view (looking from front-right-above):
 *   +X world axis → screen-right and slightly down
 *   +Y world axis → screen-up
 *   +Z world axis → screen-left and slightly down (toward viewer)
 */
export class Client extends IgeBaseClass {
    classId = "Client";
    constructor() {
        super();
        void this.init();
    }
    async init() {
        this.log("Starting isometric coordinate test...");
        const renderer = new IgeWebGlRenderer();
        renderer.preserveDrawingBuffer(true);
        ige.engine.renderer(renderer);
        renderer.createFrontBuffer(true, true);
        await renderer.setup();
        await ige.engine.start();
        const scene = new IgeScene2d();
        scene.id("testScene");
        const viewport = new IgeViewport();
        viewport.id("testViewport").autoSize(true).scene(scene);
        const camera = viewport.camera;
        camera.projectionType("orthographic");
        camera.near(0.1);
        camera.far(1000);
        const canvas = renderer.canvasElement();
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        camera.orthoSize(canvasH);
        // Classic isometric camera: elevated ~35.264° and rotated 45° azimuth
        // Position = distance * (sin(45°), sin(35.264°), cos(45°))
        const dist = 400;
        const azimuth = Math.PI / 4; // 45 degrees
        const elevation = Math.atan(1 / Math.sqrt(2)); // ~35.264 degrees
        const camX = dist * Math.sin(azimuth) * Math.cos(elevation);
        const camY = dist * Math.sin(elevation);
        const camZ = dist * Math.cos(azimuth) * Math.cos(elevation);
        camera.translateTo(camX, camY, camZ);
        camera._lookAt = new IgePoint3d(0, 0, 0);
        viewport.mount(ige.engine);
        // Add bright ambient light
        const ambient = new IgeAmbientLight();
        ambient.id("testAmbient");
        ambient.lightColor(1, 1, 1);
        ambient.intensity(1);
        ambient.mount(scene);
        renderer.lightManager?.addLight(ambient);
        // Create colored cubes along each world axis
        const cubeSize = 30;
        const axisLength = 80;
        const cubeGeometry = IgePrimitiveGeometry.createCube(cubeSize, "iso_cube");
        const testEntities = [
            { name: "origin (white)", worldPos: new IgePoint3d(0, 0, 0), color: { r: 1, g: 1, b: 1 }, rgb255: [255, 255, 255] },
            { name: "+X (red)", worldPos: new IgePoint3d(axisLength, 0, 0), color: { r: 1, g: 0, b: 0 }, rgb255: [255, 0, 0] },
            { name: "+Y (green)", worldPos: new IgePoint3d(0, axisLength, 0), color: { r: 0, g: 1, b: 0 }, rgb255: [0, 255, 0] },
            { name: "+Z (blue)", worldPos: new IgePoint3d(0, 0, axisLength), color: { r: 0, g: 0, b: 1 }, rgb255: [0, 0, 255] }
        ];
        for (const config of testEntities) {
            const entity = new IgeEntity();
            entity.id(`iso_${config.name}`);
            entity._geometryData = { ...cubeGeometry, id: `geom_iso_${config.name}` };
            entity._materialData = {
                color: { r: config.color.r, g: config.color.g, b: config.color.b, a: 1 },
                metallic: 0,
                roughness: 1
            };
            entity.translateTo(config.worldPos.x, config.worldPos.y, config.worldPos.z);
            entity.mount(scene);
        }
        this.log("Isometric entities created. Waiting for render...");
        await this._waitFrames(3);
        const pixels = renderer.readAllPixels();
        if (!pixels) {
            this.log("ERROR: Could not read pixels");
            return;
        }
        const results = [];
        // Get camera matrices
        const cameraController = renderer._cameraController;
        const matrices = cameraController.updateCamera(camera, viewport);
        // Compute and log all screen positions
        const screenPositions = [];
        for (const config of testEntities) {
            const sp = worldToScreen(config.worldPos, matrices.view, matrices.projection, canvasW, canvasH);
            screenPositions.push(sp);
            this.log(`${config.name}: world(${config.worldPos.x},${config.worldPos.y},${config.worldPos.z}) -> screen(${sp.x.toFixed(1)},${sp.y.toFixed(1)})`);
            // Check pixel color at the projected position
            results.push({
                ...assertPixelColor(pixels, sp.x, sp.y, canvasW, canvasH, config.rgb255[0], config.rgb255[1], config.rgb255[2], 60),
                name: `${config.name} color at screen(${Math.round(sp.x)},${Math.round(sp.y)})`
            });
        }
        const [originSP, plusXSP, plusYSP, plusZSP] = screenPositions;
        // Directional checks for isometric view
        // +X axis should be to the RIGHT of origin
        results.push({
            name: "+X is right of origin",
            passed: plusXSP.x > originSP.x,
            expected: `screenX > ${originSP.x.toFixed(1)}`,
            actual: `screenX = ${plusXSP.x.toFixed(1)}`
        });
        // +Y axis should be ABOVE origin (lower screen Y)
        results.push({
            name: "+Y is above origin",
            passed: plusYSP.y < originSP.y,
            expected: `screenY < ${originSP.y.toFixed(1)}`,
            actual: `screenY = ${plusYSP.y.toFixed(1)}`
        });
        // +Z axis should be to the LEFT of origin (toward viewer = left in iso from front-right)
        results.push({
            name: "+Z is left of origin",
            passed: plusZSP.x < originSP.x,
            expected: `screenX < ${originSP.x.toFixed(1)}`,
            actual: `screenX = ${plusZSP.x.toFixed(1)}`
        });
        // All three axis cubes should be at distinct screen positions
        const allDistinct = Math.abs(plusXSP.x - plusYSP.x) > 10 &&
            Math.abs(plusXSP.x - plusZSP.x) > 10 &&
            Math.abs(plusYSP.x - plusZSP.x) > 10;
        results.push({
            name: "all axes visually distinct",
            passed: allDistinct,
            expected: "separated by >10px",
            actual: `X:${Math.round(plusXSP.x)}, Y:${Math.round(plusYSP.x)}, Z:${Math.round(plusZSP.x)}`
        });
        displayResults(results);
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
