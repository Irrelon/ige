import { IgeEntityBox2d } from "@/engine/components/physics/box2d/IgeEntityBox2d";
import { ige } from "@/engine/instance";
import { IgeAnimationComponent } from "@/engine/components/IgeAnimationComponent";
import { IgeBox2dBodyType } from "@/enums/IgeBox2dBodyType";
import { IgeBox2dFixtureShapeType } from "@/enums/IgeBox2dFixtureShapeType";
import { isClient } from "@/engine/clientServer";

export class Ore extends IgeEntityBox2d {
	classId = "Ore";
	_publicGameData: Record<string, any>;

	constructor (publicGameData: Record<string, any> = {}) {
		super();

		this.category("ore")
			.depth(10);

		this._publicGameData = publicGameData;

		this.layer(1)
			.width(25)
			.height(25);

		if (ige.box2d) {
			// Create box2d body for this object
			this.box2dBody({
				type: IgeBox2dBodyType.dynamic,
				linearDamping: 0.7,
				angularDamping: 0.2,
				allowSleep: true,
				bullet: false,
				gravitic: true,
				fixedRotation: false,
				fixtures: [{
					density: 1.0,
					friction: 0,
					restitution: 0.8,
					filter: {
						categoryBits: 0x0008,
						maskBits: 0xffff
					},
					shape: {
						type: IgeBox2dFixtureShapeType.circle
					}
				}]
			});
		}

		if (isClient) {
			this.texture(ige.textures.get("ore1"));
			this.addComponent("animation", IgeAnimationComponent);

			const animation = this.components.animation as IgeAnimationComponent;

			animation.define("ore", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 25, -1);
			animation.start("ore");
		}
	}

	streamCreateData () {
		return this._publicGameData;
	}
}
