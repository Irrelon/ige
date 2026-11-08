import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeTexture } from "../../engine/core/IgeTexture.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import { IgeWebGlRenderer } from "../../engine/core/IgeWebGlRenderer.js"
import { ige } from "../../engine/instance.js"
import { IgeBehaviourType } from "../../enums/index.js";
// @ts-ignore
window.ige = ige;
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
        const w = entity._bounds2d.x, h = entity._bounds2d.y;
        const value = Math.max(0, Math.min(1, entity.data("value") ?? 1));
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
export class Client extends IgeBaseClass {
    classId = "Client";
    constructor() {
        super();
        void this.init();
    }
    async init() {
        const renderer = new IgeWebGlRenderer();
        ige.engine.renderer(renderer);
        renderer.createFrontBuffer(true);
        await renderer.setup();
        renderer.setClearColor(0.08, 0.09, 0.12, 1);
        const fairy = new IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");
        const star = new IgeTexture("star", starTexture);
        const bar = new IgeTexture("bar", barTexture);
        const label = new IgeTexture("label", labelTexture);
        await ige.textures.whenLoaded();
        await ige.engine.start();
        const scene = new IgeScene2d().id("scene");
        const split = new URLSearchParams(window.location.search).get("split") === "1";
        const views = [];
        if (!split) {
            const viewport = new IgeViewport().id("viewport").autoSize(true).scene(scene).mount(ige.engine);
            // Canvas 2D style view: (0, 0) is the centre of the screen, y down
            viewport.camera.preset("screen2d");
            views.push(viewport);
        }
        else {
            // Two views side by side (WebGL viewport y is measured from the bottom)
            for (let i = 0; i < 2; i++) {
                const viewport = new IgeViewport().id(`viewport_${i}`).autoSize(false).scene(scene).mount(ige.engine);
                viewport.camera.preset("screen2d");
                views.push(viewport);
            }
            views[0].camera.translateTo(0, -120, 0); // left: panned up to the sprites
            views[1].camera.scaleTo(1.6, 1.6, 1.6); // right: zoomed in on the stars
            views[1].camera.translateTo(0, 40, 0);
            const layout = () => {
                const halfW = Math.floor(ige.engine._bounds2d.x / 2);
                views.forEach((viewport, i) => {
                    viewport._bounds2d.x = halfW - 2;
                    viewport._bounds2d.y = ige.engine._bounds2d.y;
                    viewport._translate.x = i * (halfW + 2);
                    viewport._translate.y = 0;
                });
            };
            layout();
            window.addEventListener("resize", layout);
        }
        // A row of labelled image sprites along the top (y is negative = up)
        for (let i = 0; i < 5; i++) {
            const sprite = new IgeEntity()
                .texture(fairy)
                .width(80)
                .height(80)
                .translateTo(-320 + i * 160, -220, 0)
                .mount(scene);
            new IgeEntity()
                .texture(label)
                .data("text", `fairy ${i + 1}`)
                .width(120)
                .height(24)
                .translateTo(0, 56, 0)
                .cache(true) // static text: drawn once
                .mount(sprite);
        }
        // A spinning "solar system": stars orbit a parent that rotates in 2D
        const system = new IgeEntity().translateTo(0, 40, 0).mount(scene);
        const sun = new IgeEntity()
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
            const orbiter = new IgeEntity()
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
            bars.push(new IgeEntity()
                .texture(bar)
                .width(220)
                .height(22)
                .translateTo(-260 + i * 260, 270, 0)
                .mount(scene));
        }
        const stats = document.getElementById("stats");
        let time = 0;
        ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "animate2d", (_engine, tickDelta) => {
            const dt = (tickDelta || 16) / 1000;
            time += dt;
            system.rotateBy(0, 0, dt * 0.4); // 2D rotation: z, clockwise on screen
            sun.rotateBy(0, 0, -dt * 0.8);
            for (const orbiter of orbiters)
                orbiter.rotateBy(0, 0, dt * 2);
            sun.scaleTo(1 + Math.sin(time * 2) * 0.08, 1 + Math.sin(time * 2) * 0.08, 1);
            bars.forEach((b, i) => b.data("value", (Math.sin(time * (0.6 + i * 0.3)) + 1) / 2));
            if (stats)
                stats.textContent = `fps ${ige.engine._fps} | views ${views.length} | draws ${renderer.stats().drawCalls}`;
        });
    }
}
