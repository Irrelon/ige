import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay.js"
import { Building } from "./base/Building.js"
import { isClient } from "../../../engine/clientServer.js"
import { registerClass } from "../../../engine/igeClassStore.js"
import { ige } from "../../../engine/instance.js"
export class MiningBuilding extends Building {
    classId = "MiningBuilding";
    constructor(tileX = NaN, tileY = NaN, produces, requires = []) {
        super();
        this.tileX = tileX;
        this.tileY = tileY;
        this._produces = produces;
        this._requires = requires;
        this.layer(10);
        this.isometric(ige.data("isometric"));
        this.width(80);
        this.height(100);
        this.bounds3d(40, 40, 50);
        if (isClient) {
            this.uiResourceDisplay = new UiRequiresProducesDisplay(produces, requires).mount(this);
            this.texture(ige.textures.get("mine"));
            // const smokeEmitter1 = new IgeParticleEmitter()
            // 	//.drawBounds(true)
            // 	.particle(SmokeParticle)
            // 	.lifeBase(2000)
            // 	.quantityTimespan(2000)
            // 	.quantityBase(10)
            // 	.translateVarianceX(-5, 5)
            // 	.scaleBaseX(0.1)
            // 	.scaleBaseY(0.1)
            // 	.scaleLockAspect(true)
            // 	.rotateVariance(-90, 90)
            // 	.opacityBase(0.6)
            // 	.opacityVariance(0.2, 0.8)
            // 	.velocityVector(new IgePoint3d(0, -0.01, 0), new IgePoint3d(-0.005, -0.01, 0), new IgePoint3d(0.005, -0.01, 0))
            // 	.linearForceVector(new IgePoint3d(0.02, 0, 0), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0))
            // 	.deathScaleBaseX(0.2)
            // 	.deathScaleVarianceX(0.2, 2)
            // 	.deathScaleVarianceY(0.2, 2)
            // 	.deathScaleBaseY(1)
            // 	//.deathRotateBase(0)
            // 	//.deathRotateVariance(-360, 360)
            // 	.deathOpacityBase(0.0)
            // 	.depth(1)
            // 	.width(10)
            // 	.height(10)
            // 	.translateTo(-16, -32, 0)
            // 	.particleMountTarget(ige.$("scene1") as IgeScene2d)
            // 	.mount(this);
            //
            // this.productionEffects.push(smokeEmitter1);
        }
    }
    streamCreateConstructorArgs() {
        return [this.tileX, this.tileY, this._produces, this._requires];
    }
    _mounted(obj) {
        super._mounted(obj);
        if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
            this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
        }
    }
}
registerClass(MiningBuilding);
