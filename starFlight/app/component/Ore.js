import { IgeEntityBox2d } from "../../../engine/components/physics/box2d/IgeEntityBox2d.js";
import { ige } from "../../../engine/instance.js";
import { IgeTextureAnimationComponent } from "../../../engine/components/IgeTextureAnimationComponent.js";
import { IgeBox2dBodyType } from "../../../enums/IgeBox2dBodyType.js";
import { IgeBox2dFixtureShapeType } from "../../../enums/IgeBox2dFixtureShapeType.js";
import { isClient } from "../../../engine/clientServer.js";
export class Ore extends IgeEntityBox2d {
    constructor(publicGameData = {}) {
        super();
        this.classId = "Ore";
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
            this.addComponent("animation", IgeTextureAnimationComponent);
            const animation = this.components.animation;
            animation.define("ore", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 25, -1);
            animation.start("ore");
        }
    }
    streamCreateData() {
        return this._publicGameData;
    }
}