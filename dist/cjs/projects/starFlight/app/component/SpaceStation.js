"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceStation = void 0;
const instance_1 = require("@/engine/instance");
const clientServer_1 = require("@/engine/clientServer");
const IgeVelocityComponent_1 = require("@/engine/components/IgeVelocityComponent");
const IgeEntityBox2d_1 = require("@/engine/components/physics/box2d/IgeEntityBox2d");
const IgeBox2dBodyType_1 = require("@/enums/IgeBox2dBodyType");
const IgeBox2dFixtureShapeType_1 = require("@/enums/IgeBox2dFixtureShapeType");
const igeClassStore_1 = require("@/engine/igeClassStore");
class SpaceStation extends IgeEntityBox2d_1.IgeEntityBox2d {
    constructor(publicGameData) {
        super();
        this.classId = "SpaceStation";
        this._publicGameData = publicGameData;
        this.layer(0)
            .width(948)
            .height(708);
        //.box2dNoDebug(true);
        if (clientServer_1.isServer) {
            this.addComponent("velocity", IgeVelocityComponent_1.IgeVelocityComponent);
        }
        if (clientServer_1.isServer) {
            // Create Box2D body for this object
            this.box2dBody({
                type: IgeBox2dBodyType_1.IgeBox2dBodyType.dynamic,
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
                            type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.circle
                        }
                    }]
            });
        }
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get(publicGameData.texture));
        }
    }
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
}
exports.SpaceStation = SpaceStation;
(0, igeClassStore_1.registerClass)(SpaceStation);
