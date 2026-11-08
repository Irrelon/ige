"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeViewportOverlay = void 0;
const enums_1 = require("../../enums/index.js");
const instance_1 = require("../instance.js");
let nextOverlayId = 1;
/**
 * DOM elements (health bars, name tags, damage numbers, waypoint markers)
 * kept over world positions in each viewport of an IgeWebGlRenderer.
 *
 * Every viewport gets its own clipping layer over its area of the canvas,
 * so in split screen a marker never spills into a neighbouring view, and
 * each view gets its own copy of a marker. Markers are positioned after
 * every rendered frame; ones behind the camera or outside the view are
 * hidden.
 * @example #A name tag over every player in every view
 *     const overlay = new IgeViewportOverlay(renderer);
 *     overlay.add({
 *         entity: player,
 *         offset: { x: 0, y: 180, z: 0 },
 *         create: () => Object.assign(document.createElement("div"), { textContent: "P1", className: "tag" })
 *     });
 */
class IgeViewportOverlay {
    /**
     * @param renderer The renderer whose viewports to follow.
     * @param container Element to put the overlay in (default: the
     * canvas's parent). It should be positioned so the overlay can sit over
     * the canvas.
     */
    constructor(renderer, container) {
        var _a;
        this._layers = new Map();
        this._layerRects = new Map();
        this._markers = new Set();
        this._renderer = renderer;
        const canvas = (_a = renderer.canvasElement) === null || _a === void 0 ? void 0 : _a.call(renderer);
        const parent = container || (canvas === null || canvas === void 0 ? void 0 : canvas.parentElement) || document.body;
        this._root = document.createElement("div");
        this._root.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:10;";
        parent.appendChild(this._root);
        // Position markers after each tick (after the frame is drawn)
        this._behaviourId = `igeViewportOverlay_${nextOverlayId++}`;
        instance_1.ige.engine.addBehaviour(enums_1.IgeBehaviourType.postTick, this._behaviourId, () => this.update());
    }
    /** Add a marker. Returns a handle with remove(). */
    add(options) {
        const marker = {
            options,
            elements: new Map(),
            lastTransform: new Map(),
            remove: () => this.remove(marker)
        };
        this._markers.add(marker);
        return marker;
    }
    /** Remove a marker and its elements. */
    remove(marker) {
        for (const element of marker.elements.values())
            element.remove();
        marker.elements.clear();
        marker.lastTransform.clear();
        this._markers.delete(marker);
    }
    /** Remove every marker. */
    clear() {
        for (const marker of [...this._markers])
            this.remove(marker);
    }
    /** Remove the overlay from the page and stop updating it. */
    destroy() {
        this.clear();
        instance_1.ige.engine.removeBehaviour(enums_1.IgeBehaviourType.postTick, this._behaviourId);
        this._root.remove();
        this._layers.clear();
    }
    /**
     * Position every marker. Called automatically after each engine tick;
     * call it yourself only if you move things between ticks.
     */
    update() {
        var _a, _b, _c;
        const renderer = this._renderer;
        const canvas = (_a = renderer.canvasElement) === null || _a === void 0 ? void 0 : _a.call(renderer);
        if (!canvas)
            return;
        // Keep the overlay root over the canvas
        const rootRect = `${canvas.offsetLeft}px,${canvas.offsetTop}px`;
        if (this._root.dataset.rect !== rootRect) {
            this._root.dataset.rect = rootRect;
            this._root.style.left = `${canvas.offsetLeft}px`;
            this._root.style.top = `${canvas.offsetTop}px`;
        }
        const canvasHeight = canvas.clientHeight;
        const viewports = instance_1.ige.engine._children.filter((child) => child.camera);
        for (const viewport of viewports) {
            const layer = this._layerFor(viewport, canvasHeight);
            const matrices = renderer.cameraMatrices(viewport);
            if (!matrices)
                continue;
            const m = matrices.viewProjection.matrix;
            const width = viewport._bounds2d.x;
            const height = viewport._bounds2d.y;
            for (const marker of this._markers) {
                const o = marker.options;
                if (o.viewports && !o.viewports.includes(viewport))
                    continue;
                let element = marker.elements.get(viewport);
                if (!element) {
                    element = o.create(viewport);
                    element.style.position = "absolute";
                    element.style.left = "0";
                    element.style.top = "0";
                    element.style.willChange = "transform";
                    layer.appendChild(element);
                    marker.elements.set(viewport, element);
                }
                const world = this._worldPosition(o);
                let visible = !!world;
                let sx = 0, sy = 0;
                if (world) {
                    const cx = m[0] * world.x + m[4] * world.y + m[8] * world.z + m[12];
                    const cy = m[1] * world.x + m[5] * world.y + m[9] * world.z + m[13];
                    const cz = m[2] * world.x + m[6] * world.y + m[10] * world.z + m[14];
                    const cw = m[3] * world.x + m[7] * world.y + m[11] * world.z + m[15];
                    if (cw <= 0) {
                        visible = false;
                    }
                    else {
                        const nx = cx / cw, ny = cy / cw, nz = cz / cw;
                        visible = nx >= -1.2 && nx <= 1.2 && ny >= -1.2 && ny <= 1.2 && nz >= -1 && nz <= 1;
                        sx = (nx * 0.5 + 0.5) * width;
                        sy = (1 - (ny * 0.5 + 0.5)) * height;
                    }
                }
                if (!visible) {
                    if (element.style.display !== "none")
                        element.style.display = "none";
                    continue;
                }
                if (element.style.display === "none")
                    element.style.display = "";
                const transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-50%)`;
                if (marker.lastTransform.get(element) !== transform) {
                    element.style.transform = transform;
                    marker.lastTransform.set(element, transform);
                }
                (_b = o.update) === null || _b === void 0 ? void 0 : _b.call(o, element, viewport);
            }
        }
        // Drop layers of viewports that no longer exist
        for (const [viewport, layer] of this._layers) {
            if (!viewports.includes(viewport)) {
                layer.remove();
                this._layers.delete(viewport);
                this._layerRects.delete(viewport);
                for (const marker of this._markers) {
                    (_c = marker.elements.get(viewport)) === null || _c === void 0 ? void 0 : _c.remove();
                    marker.elements.delete(viewport);
                }
            }
        }
    }
    /** World position of a marker, or null when its entity is hidden or gone. */
    _worldPosition(o) {
        var _a;
        let x, y, z;
        if (o.entity) {
            const entity = o.entity;
            if (!entity._alive || entity._hidden || !entity._parent)
                return null;
            const w = (_a = entity._worldMatrix4) === null || _a === void 0 ? void 0 : _a.matrix;
            if (!w)
                return null;
            x = w[12];
            y = w[13];
            z = w[14];
        }
        else if (o.position) {
            x = o.position.x;
            y = o.position.y;
            z = o.position.z;
        }
        else {
            return null;
        }
        if (o.offset) {
            x += o.offset.x;
            y += o.offset.y;
            z += o.offset.z;
        }
        return { x, y, z };
    }
    /** The clipping layer covering a viewport's area of the canvas. */
    _layerFor(viewport, canvasHeight) {
        var _a, _b;
        let layer = this._layers.get(viewport);
        if (!layer) {
            layer = document.createElement("div");
            layer.style.cssText = "position:absolute;overflow:hidden;pointer-events:none;";
            this._root.appendChild(layer);
            this._layers.set(viewport, layer);
        }
        // Viewport y is measured from the canvas bottom (WebGL convention)
        const left = ((_a = viewport._translate) === null || _a === void 0 ? void 0 : _a.x) || 0;
        const top = canvasHeight - ((((_b = viewport._translate) === null || _b === void 0 ? void 0 : _b.y) || 0) + viewport._bounds2d.y);
        const rect = `${left},${top},${viewport._bounds2d.x},${viewport._bounds2d.y}`;
        if (this._layerRects.get(viewport) !== rect) {
            this._layerRects.set(viewport, rect);
            layer.style.left = `${left}px`;
            layer.style.top = `${top}px`;
            layer.style.width = `${viewport._bounds2d.x}px`;
            layer.style.height = `${viewport._bounds2d.y}px`;
        }
        return layer;
    }
}
exports.IgeViewportOverlay = IgeViewportOverlay;
