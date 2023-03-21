import { ige } from "../../../engine/instance.js";
import { isClient, isServer } from "../../../engine/clientServer.js";
import { IgeVelocityComponent } from "../../../engine/components/IgeVelocityComponent.js";
import { IgeEntityBox2d } from "../../../engine/components/physics/box2d/IgeEntityBox2d.js";
import { IgeBox2dBodyType } from "../../../enums/IgeBox2dBodyType.js";
import { IgeBox2dFixtureShapeType } from "../../../enums/IgeBox2dFixtureShapeType.js";
export class SpaceStation extends IgeEntityBox2d {
    constructor(publicGameData = {}) {
        super();
        this.classId = "SpaceStation";
        this._publicGameData = publicGameData;
        this.layer(0)
            .width(948)
            .height(708);
        //.box2dNoDebug(true);
        if (isServer) {
            this.addComponent("velocity", IgeVelocityComponent);
        }
        if (ige.box2d) {
            // Create box2d body for this object
            this.box2dBody({
                type: IgeBox2dBodyType.dynamic,
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
                            type: IgeBox2dFixtureShapeType.circle
                        }
                    }]
            });
        }
        if (isClient) {
            this.texture(ige.textures.get(publicGameData.texture));
        }
    }
    streamCreateData() {
        return this._publicGameData;
    }
}
