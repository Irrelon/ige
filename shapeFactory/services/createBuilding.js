import { ige } from "../../engine/instance.js";
import { Road } from "../entities/Road.js";
import { StorageBuilding } from "../entities/StorageBuilding.js";
import { FlagBuilding } from "../entities/FlagBuilding.js";
import { Transporter } from "../entities/Transporter.js";
import { MiningBuilding } from "../entities/MiningBuilding.js";
import { ResourceType } from "../enums/ResourceType.js";
import { FactoryBuilding } from "../entities/FactoryBuilding.js";
export const createStorageBuilding = (parent, id, x, y) => {
    const storageBuilding = new StorageBuilding()
        .id(id)
        .translateTo(x, y, 0)
        .mount(parent);
    storageBuilding.flag = new FlagBuilding()
        .translateTo(storageBuilding._translate.x, storageBuilding._translate.y + 100, 0)
        .mount(parent);
    new Road(storageBuilding.id(), storageBuilding.flag.id())
        .mount(parent);
    new Transporter(storageBuilding.id(), storageBuilding.id(), storageBuilding.flag.id())
        .translateTo(storageBuilding._translate.x, storageBuilding._translate.y, 0)
        .mount(parent);
    return storageBuilding;
};
export const createMiningBuilding = (parent, id, x, y, resourceType) => {
    const miningBuilding = new MiningBuilding(resourceType, [])
        .id(id)
        .translateTo(x, y, 0)
        .mount(parent);
    miningBuilding.flag = new FlagBuilding()
        .translateTo(miningBuilding._translate.x, miningBuilding._translate.y + 100, 0)
        .mount(parent);
    new Road(miningBuilding.id(), miningBuilding.flag.id())
        .mount(parent);
    const base = ige.$("base1");
    new Transporter(base.id(), miningBuilding.id(), miningBuilding.flag.id())
        .translateTo(base._translate.x, base._translate.y, 0)
        .mount(parent);
    return miningBuilding;
};
export const createFactoryBuilding = (parent, id, x, y) => {
    const factoryBuilding = new FactoryBuilding(ResourceType.energy, [{
            type: ResourceType.wood,
            count: 1,
            max: 1
        }, {
            type: ResourceType.grain,
            count: 1,
            max: 1
        }])
        .id(id)
        .translateTo(x, y, 0)
        .mount(parent);
    factoryBuilding.flag = new FlagBuilding()
        .translateTo(factoryBuilding._translate.x, factoryBuilding._translate.y + 100, 0)
        .mount(parent);
    new Road(factoryBuilding.id(), factoryBuilding.flag.id())
        .mount(parent);
    const base = ige.$("base1");
    new Transporter(base.id(), factoryBuilding.id(), factoryBuilding.flag.id())
        .translateTo(base._translate.x, base._translate.y, 0)
        .mount(parent);
    return factoryBuilding;
};
