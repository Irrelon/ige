import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay";
import { Building } from "./base/Building";
import { isClient } from "@/engine/clientServer";
import type { IgeObject } from "@/engine/core/IgeObject";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/engine/exports";
import { registerClass } from "@/engine/igeClassStore";
import type { ResourceType } from "../enums/ResourceType";
import type { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";

export class FactoryBuilding2 extends Building {
	classId = "FactoryBuilding2";
	tileXDelta = -1;
	tileYDelta = -1;
	tileW = 3;
	tileH = 3;

	constructor (
		tileX: number = NaN,
		tileY: number = NaN,
		produces: ResourceType,
		requires: BuildingResourceRequirement[] = []
	) {
		super();

		this.tileX = tileX;
		this.tileY = tileY;
		this._produces = produces;
		this._requires = requires;

		this.layer(10);
		this.isometric(ige.data("isometric"));
		this.width(132);
		this.height(160);
		this.bounds3d(70, 80, 70);

		if (isClient) {
			this.uiResourceDisplay = new UiRequiresProducesDisplay(produces, requires).mount(this);
			this.texture(ige.textures.get("factory2"));
			this._textureOffset = new IgePoint2d(16, -10);

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
			// 	.deathOpacityBase(0.0)
			// 	.depth(1)
			// 	.width(10)
			// 	.height(10)
			// 	.translateTo(6, -70, 0)
			// 	.particleMountTarget(ige.$("scene1") as IgeScene2d)
			// 	.mount(this);
			//
			// const smokeEmitter2 = new IgeParticleEmitter()
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
			// 	.deathOpacityBase(0.0)
			// 	.depth(1)
			// 	.width(10)
			// 	.height(10)
			// 	.translateTo(24, -62, 0)
			// 	.particleMountTarget(ige.$("scene1") as IgeScene2d)
			// 	.mount(this);
			//
			// this.productionEffects.push(smokeEmitter1);
			// this.productionEffects.push(smokeEmitter2);
		}
	}

	streamCreateConstructorArgs () {
		return [this.tileX, this.tileY, this._produces, this._requires];
	}

	_mounted (obj: IgeObject) {
		super._mounted(obj);

		if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
			this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
		}
	}
}

registerClass(FactoryBuilding2);
