var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../engine/instance.js";
import IgeBaseClass from "../../engine/core/IgeBaseClass.js";
import IgeScene2d from "../../engine/core/IgeScene2d.js";
import IgeViewport from "../../engine/core/IgeViewport.js";
import IgeTexture from "../../engine/core/IgeTexture.js";
import IgeParticleEmitter from "../../engine/core/IgeParticleEmitter.js";
import IgePoint3d from "../../engine/core/IgePoint3d.js";
import IgeParticle from "../../engine/core/IgeParticle.js";
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            ige.init();
            new IgeTexture("star1", '../assets/textures/particles/star1.png');
            new IgeTexture("star2", '../assets/textures/particles/star2.png');
            new IgeTexture("star3", '../assets/textures/particles/star3.png');
            new IgeTexture("star4", '../assets/textures/particles/star4.png');
            // Wait for our textures to load before continuing
            yield ige.textures.whenLoaded();
            // Create the HTML canvas
            ige.engine.createFrontBuffer(true);
            // Start the engine
            yield ige.engine.start();
            class StarParticle extends IgeParticle {
                constructor(emitter) {
                    super(emitter);
                    this.classId = 'StarParticle';
                    this.noAabb(true);
                    // Setup the particle default values
                    this.texture(ige.textures.get("star" + (Math.round(Math.random() * 3) + 1)))
                        .width(50)
                        .height(50)
                        .drawBounds(false)
                        .drawBoundsData(false);
                }
            }
            // Create the scene
            const scene1 = new IgeScene2d()
                .id('scene1');
            // Create the main viewport
            const vp1 = new IgeViewport()
                //.addComponent("mousePan", IgeMousePanComponent)
                //.components.mousePan.enabled(true)
                .id('vp1')
                .autoSize(true)
                .scene(scene1)
                .drawBounds(true)
                .drawBoundsData(true)
                .mount(ige.engine);
            // Create an entity
            const particleEmitter = new IgeParticleEmitter()
                .id('emitter1')
                .particle(StarParticle)
                .lifeBase(2500)
                .quantityTimespan(1000)
                .quantityBase(60)
                .translateVarianceX(-50, 50)
                .scaleBaseX(0.2)
                .scaleBaseY(0.2)
                .scaleLockAspect(true)
                .rotateVariance(0, 360)
                .opacityBase(0.5)
                .velocityVector(new IgePoint3d(0, -0.1, 0), new IgePoint3d(-0.2, -0.1, 0), new IgePoint3d(0.2, -0.25, 0))
                .linearForceVector(new IgePoint3d(0, 0.12, 0), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0))
                .deathScaleBaseX(0)
                .deathScaleVarianceX(0, 1)
                .deathScaleBaseY(0.7)
                .deathRotateBase(0)
                .deathRotateVariance(-360, 360)
                .deathOpacityBase(0.0)
                .depth(1)
                .width(10)
                .height(10)
                .translateTo(0, ige.engine._bounds2d.y2, 0)
                .particleMountTarget(scene1)
                .mount(scene1)
                .start();
        });
    }
}
