import { ResourceType } from "../enums/ResourceType.js";
import { registerClass } from "../../engine/igeClassStore.js";
import { Star } from "./base/Star.js";
import { ige } from "../../engine/instance.js";
import { Resource } from "./Resource.js";
export class MiningBuilding extends Star {
    constructor(produces, requires = []) {
        super();
        this.classId = "MiningBuilding";
        this.depth(1);
        this._produces = produces;
        this._requires = requires;
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
