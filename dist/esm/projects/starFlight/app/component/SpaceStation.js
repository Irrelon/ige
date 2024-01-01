import { ige } from "@/engine/instance";
import { isClient, isServer } from "@/engine/clientServer";
import { IgeVelocityComponent } from "@/engine/components/IgeVelocityComponent";
import { IgeEntityBox2d } from "@/engine/components/physics/box2d/IgeEntityBox2d";
import { IgeBox2dBodyType } from "@/enums/IgeBox2dBodyType";
import { IgeBox2dFixtureShapeType } from "@/enums/IgeBox2dFixtureShapeType";
import { registerClass } from "@/engine/igeClassStore";
export class SpaceStation extends IgeEntityBox2d {
    classId = "SpaceStation";
    _publicGameData;
    constructor(publicGameData) {
        super();
        this._publicGameData = publicGameData;
        this.layer(0)
            .width(948)
            .height(708);
        //.box2dNoDebug(true);
        if (isServer) {
            this.addComponent("velocity", IgeVelocityComponent);
        }
        if (isServer) {
            // Create Box2D body for this object
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
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
}
registerClass(SpaceStation);