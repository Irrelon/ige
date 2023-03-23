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
            const destinations = ["base1", "resourceBuilding1", "factoryBuilding1", "factoryBuilding2"];
            new IgeInterval(() => {
                const r = Math.floor(Math.random() * 4);
                const destinationId = destinations[r];
                new Resource(this._produces, this.id(), destinationId)
                    .translateTo(this._translate.x, this._translate.y, 0)
                    .mount(ige.$("scene1"));
            }, Math.random() * 12000 + 5000);
        }
        this.pointerUp(() => {
            new Resource(ResourceType.wood, this.id(), "base1")
                .translateTo(this._translate.x, this._translate.y, 0)
                .mount(ige.$("scene1"));
        });
    }
    streamCreateConstructorArgs() {
        return [this._produces, this._requires];
    }
}
registerClass(MiningBuilding);
