import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay";
import { Building } from "./base/Building";
import { isClient } from "@/engine/clientServer";
import type { IgeObject } from "@/engine/core/IgeObject";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "@/engine/exports";
import type { ResourceType } from "../enums/ResourceType";
import type { BuildingResourceRequirement } from "../types/BuildingResourceRequirement";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export class HouseBuilding1 extends Building {
	classId = "HouseBuilding1";

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
		this.width(80);
		this.height(100);
		this.bounds3d(40, 40, 50);

		if (isClient) {
			this.uiResourceDisplay = new UiRequiresProducesDisplay(produces, requires).mount(this);
			this.texture(ige.textures.get("house1"));

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
			// 	.translateTo(22, -34, 0)
			// 	.particleMountTarget(ige.$("scene1") as IgeScene2d)
			// 	.mount(this);
			//
			// this.productionEffects.push(smokeEmitter1);
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

	update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
		super.update(ctx, tickDelta);

		// Update the required resources UI display
	}
}

registerClass(HouseBuilding1);
