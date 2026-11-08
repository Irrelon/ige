"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeWebGlAvailable = igeWebGlAvailable;
exports.igeCreateRenderer = igeCreateRenderer;
const IgeCanvas2dRenderer_1 = require("./IgeCanvas2dRenderer.js");
const IgeWebGlRenderer_1 = require("./IgeWebGlRenderer.js");
let webGlSupport;
/** Whether the browser can create a WebGL context (checked once). */
function igeWebGlAvailable() {
    if (webGlSupport !== undefined)
        return webGlSupport;
    try {
        const canvas = typeof document !== "undefined" ? document.createElement("canvas") : undefined;
        webGlSupport = !!canvas && !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    }
    catch (_a) {
        webGlSupport = false;
    }
    return webGlSupport;
}
/**
 * Create the renderer a game should use: IgeWebGlRenderer when the browser
 * supports WebGL, else IgeCanvas2dRenderer. Assign it with
 * ige.engine.renderer(renderer); ige.engine.start() does all of this itself
 * when no renderer has been assigned.
 * @example #A 2D game that runs on WebGL where it can
 *     ige.engine.renderer(igeCreateRenderer({ mode: "2d" }));
 *     await ige.engine.start();
 */
function igeCreateRenderer(options = {}) {
    var _a;
    const mode = (_a = options.mode) !== null && _a !== void 0 ? _a : "2d";
    const useWebGl = mode !== "iso" && options.prefer !== "canvas2d" && (options.prefer === "webgl" || igeWebGlAvailable());
    if (!useWebGl) {
        if (mode === "3d")
            console.warn("igeCreateRenderer: WebGL isn't available, so 3D content won't draw (falling back to Canvas 2D)");
        return new IgeCanvas2dRenderer_1.IgeCanvas2dRenderer();
    }
    const renderer = new IgeWebGlRenderer_1.IgeWebGlRenderer();
    if (mode === "2d")
        renderer.defaultCameraPreset("screen2d");
    return renderer;
}
