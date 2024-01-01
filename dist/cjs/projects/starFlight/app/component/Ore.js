"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ore = void 0;
const instance_1 = require("@/engine/instance");
const IgeEntityBox2d_1 = require("@/engine/components/physics/box2d/IgeEntityBox2d");
const IgeTextureAnimationComponent_1 = require("@/engine/components/IgeTextureAnimationComponent");
const IgeBox2dBodyType_1 = require("@/enums/IgeBox2dBodyType");
const IgeBox2dFixtureShapeType_1 = require("@/enums/IgeBox2dFixtureShapeType");
const clientServer_1 = require("@/engine/clientServer");
const igeClassStore_1 = require("@/engine/igeClassStore");
class Ore extends IgeEntityBox2d_1.IgeEntityBox2d {
    constructor(publicGameData = {}) {
        super();
        this.classId = "Ore";
        this.category("ore")
            .depth(10);
        this._publicGameData = publicGameData;
        this.layer(1)
            .width(25)
            .height(25);
        if (clientServer_1.isServer) {
            // Create Box2D body for this object
            this.box2dBody({
                type: IgeBox2dBodyType_1.IgeBox2dBodyType.dynamic,
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
                            type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.circle
                        }
                    }]
            });
        }
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("ore1"));
            this.addComponent("animation", IgeTextureAnimationComponent_1.IgeTextureAnimationComponent);
            const animation = this.components.animation;
            animation.define("ore", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 25, -1);
            animation.start("ore");
        }
    }
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
}
exports.Ore = Ore;
(0, igeClassStore_1.registerClass)(Ore);
