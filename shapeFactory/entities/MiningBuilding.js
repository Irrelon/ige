import { ResourceType } from "../enums/ResourceType.js";
import { registerClass } from "../../engine/igeClassStore.js";
import { Star } from "./base/Star.js";
import { ige } from "../../engine/instance.js";
import { Resource } from "./Resource.js";
import { isServer } from "../../engine/clientServer.js";
import { IgeInterval } from "../../engine/core/IgeInterval.js";
export class MiningBuilding extends Star {
    constructor(produces, requires = []) {
        super();
        this.classId = "MiningBuilding";
        this.depth(1);
        this._produces = produces;
        this._requires = requires;
        if (isServer) {
            new IgeInterval(() => {
                new Resource(this._produces, this.id())
                    .translateTo(this._translate.x, this._translate.y, 0)
                    .mount(ige.$("scene1"));
            }, Math.random() * 12000 + 5000);
        }
        this.pointerUp(() => {
            new Resource(ResourceType.wood, this.id())
                .translateTo(this._translate.x, this._translate.y, 0)
                .mount(ige.$("scene1"));
        });
    }
    streamCreateConstructorArgs() {
        return [this._produces, this._requires];
    }
}
registerClass(MiningBuilding);
