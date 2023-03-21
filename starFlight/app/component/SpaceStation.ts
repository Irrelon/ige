import { ige } from "@/engine/instance";
import { isClient, isServer } from "@/engine/clientServer";
import { IgeVelocityComponent } from "@/engine/components/IgeVelocityComponent";
import { IgeEntityBox2d } from "@/engine/components/physics/box2d/IgeEntityBox2d";

export class SpaceStation extends IgeEntityBox2d {
	classId = "SpaceStation";
	_publicGameData: Record<string, any>;

	constructor (publicGameData: Record<string, any> = {}) {
		super();

		this._publicGameData = publicGameData;

		this.layer(0)
			.width(948)
			.height(708);
		//.box2dNoDebug(true);

		if (isServer) {
			this.addComponent("velocity", IgeVelocityComponent);
		}

		if (ige.engine.box2d) {
			// Create box2d body for this object
			this.box2dBody({
				type: "dynamic",
				linearDamping: 0.0,
				angularDamping: 0.5,
				allowSleep: true,
				bullet: false,
				gravitic: true,
				fixedRotation: false,
				fixtures: [{
					isSensor: true,
					density: 1.0,
					friction: 1.0,
					restitution: 0.2,
					shape: {
						type: "circle"
					}
				}]
			});
		}

		if (isClient) {
			this.texture(ige.textures.get(publicGameData.texture));
		}
	}

	streamCreateData () {
		return this._publicGameData;
	}
}
