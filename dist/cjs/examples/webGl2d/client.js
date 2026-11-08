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
const IgeViewport_1 = require("../../engine/core/IgeViewport.js");
const IgeWebGlRenderer_1 = require("../../engine/core/IgeWebGlRenderer.js");
const instance_1 = require("../../engine/instance.js");
const enums_1 = require("../../enums/index.js");
// @ts-ignore
window.ige = instance_1.ige;
/**
 * 2D on WebGL: the kind of scene a Canvas 2D IGE game builds, running on
 * IgeWebGlRenderer without changes to the game code beyond the renderer
 * and camera preset:
 * - camera.preset("screen2d"): x right, y down, one unit per pixel, the
 *   camera position is the centre of the view (as in Canvas 2D);
 * - smart textures (drawn with the Canvas 2D API from each entity's own
 *   data), redrawn every frame unless the entity is cached;
 * - image sprites, 2D rotation (rotate.z), scale and nested transforms;
 * - pointer events (pointerOver / pointerOut / pointerUp) on the orbiting
 *   stars: hover to highlight, click to add a point;
 * - ?split=1: two side-by-side views of the same scene, as in a 2D
 *   split-screen game, one panned and one zoomed with the camera's scale.
 */
/** A star whose colour and point count come from the entity's data. */
const starTexture = {
    render(ctx, entity) {
        const points = entity.data("points") || 5;
        const outer = entity._bounds2d.x2;
        const inner = outer * 0.45;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = entity.data("fill") || "#ffd84d";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.stroke();
    }
};
/** A health bar that redraws from the entity's data every frame. */
const barTexture = {
    render(ctx, entity) {
        var _a;
        const w = entity._bounds2d.x, h = entity._bounds2d.y;
        const value = Math.max(0, Math.min(1, (_a = entity.data("value")) !== null && _a !== void 0 ? _a : 1));
        ctx.fillStyle = "#222";
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = value > 0.3 ? "#3fbf5f" : "#d23b2b";
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, (w - 4) * value, h - 4);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round(value * 100)}%`, 0, 0);
    }
};
/** A text label: the Canvas 2D way to draw text. */
const labelTexture = {
    render(ctx, entity) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(entity.data("text") || "", 0, 0);
    }
};
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const renderer = new IgeWebGlRenderer_1.IgeWebGlRenderer();
            instance_1.ige.engine.renderer(renderer);
            renderer.createFrontBuffer(true);
            yield renderer.setup();
            renderer.setClearColor(0.08, 0.09, 0.12, 1);
            const fairy = new IgeTexture_1.IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");
            const star = new IgeTexture_1.IgeTexture("star", starTexture);
            const bar = new IgeTexture_1.IgeTexture("bar", barTexture);
            const label = new IgeTexture_1.IgeTexture("label", labelTexture);
            yield instance_1.ige.textures.whenLoaded();
            yield instance_1.ige.engine.start();
            const scene = new IgeScene2d_1.IgeScene2d().id("scene");
            const split = new URLSearchParams(window.location.search).get("split") === "1";
            const views = [];
            if (!split) {
                const viewport = new IgeViewport_1.IgeViewport().id("viewport").autoSize(true).scene(scene).mount(instance_1.ige.engine);
                // Canvas 2D style view: (0, 0) is the centre of the screen, y down
                viewport.camera.preset("screen2d");
                views.push(viewport);
            }
            else {
                // Two views side by side (WebGL viewport y is measured from the bottom)
                for (let i = 0; i < 2; i++) {
                    const viewport = new IgeViewport_1.IgeViewport().id(`viewport_${i}`).autoSize(false).scene(scene).mount(instance_1.ige.engine);
                    viewport.camera.preset("screen2d");
                    views.push(viewport);
                }
                views[0].camera.translateTo(0, -120, 0); // left: panned up to the sprites
                views[1].camera.scaleTo(1.6, 1.6, 1.6); // right: zoomed in on the stars
                views[1].camera.translateTo(0, 40, 0);
                const layout = () => {
                    const halfW = Math.floor(instance_1.ige.engine._bounds2d.x / 2);
                    views.forEach((viewport, i) => {
                        viewport._bounds2d.x = halfW - 2;
                        viewport._bounds2d.y = instance_1.ige.engine._bounds2d.y;
                        viewport._translate.x = i * (halfW + 2);
                        viewport._translate.y = 0;
                    });
                };
                layout();
                window.addEventListener("resize", layout);
            }
            // A row of labelled image sprites along the top (y is negative = up)
            for (let i = 0; i < 5; i++) {
                const sprite = new IgeEntity_1.IgeEntity()
                    .texture(fairy)
                    .width(80)
                    .height(80)
                    .translateTo(-320 + i * 160, -220, 0)
                    .mount(scene);
                new IgeEntity_1.IgeEntity()
                    .texture(label)
                    .data("text", `fairy ${i + 1}`)
                    .width(120)
                    .height(24)
                    .translateTo(0, 56, 0)
                    .cache(true) // static text: drawn once
                    .mount(sprite);
            }
            // A spinning "solar system": stars orbit a parent that rotates in 2D
            const system = new IgeEntity_1.IgeEntity().translateTo(0, 40, 0).mount(scene);
            const sun = new IgeEntity_1.IgeEntity()
                .texture(star)
                .data("points", 8)
                .data("fill", "#ffb43a")
                .width(120)
                .height(120)
                .mount(system);
            const colours = ["#5fd4ff", "#ff6fae", "#9dff6f", "#c58cff"];
            const orbiters = [];
            for (let i = 0; i < colours.length; i++) {
                const angle = (i / colours.length) * Math.PI * 2;
                const orbiter = new IgeEntity_1.IgeEntity()
                    .texture(star)
                    .data("points", 5)
                    .data("fill", colours[i])
                    .width(50)
                    .height(50)
                    .translateTo(Math.cos(angle) * 170, Math.sin(angle) * 170, 0)
                    .mount(system);
                // Pointer events work as with the Canvas 2D renderer
                orbiter.pointerOver(() => orbiter.data("fill", "#ffffff"));
                orbiter.pointerOut(() => orbiter.data("fill", colours[i]));
                orbiter.pointerUp(() => orbiter.data("points", Math.min(12, orbiter.data("points") + 1)));
                orbiters.push(orbiter);
            }
            // Health bars whose value changes every frame (smart textures redraw)
            const bars = [];
            for (let i = 0; i < 3; i++) {
                bars.push(new IgeEntity_1.IgeEntity()
                    .texture(bar)
                    .width(220)
                    .height(22)
                    .translateTo(-260 + i * 260, 270, 0)
                    .mount(scene));
            }
            const stats = document.getElementById("stats");
            let time = 0;
            instance_1.ige.engine.addBehaviour(enums_1.IgeBehaviourType.preUpdate, "animate2d", (_engine, tickDelta) => {
                const dt = (tickDelta || 16) / 1000;
                time += dt;
                system.rotateBy(0, 0, dt * 0.4); // 2D rotation: z, clockwise on screen
                sun.rotateBy(0, 0, -dt * 0.8);
                for (const orbiter of orbiters)
                    orbiter.rotateBy(0, 0, dt * 2);
                sun.scaleTo(1 + Math.sin(time * 2) * 0.08, 1 + Math.sin(time * 2) * 0.08, 1);
                bars.forEach((b, i) => b.data("value", (Math.sin(time * (0.6 + i * 0.3)) + 1) / 2));
                if (stats)
                    stats.textContent = `fps ${instance_1.ige.engine._fps} | views ${views.length} | draws ${renderer.stats().drawCalls}`;
            });
        });
    }
}
exports.Client = Client;
