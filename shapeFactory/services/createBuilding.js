import { ige } from "../../engine/instance.js";
import { Road } from "../entities/Road.js";
import { StorageBuilding } from "../entities/StorageBuilding.js";
import { FlagBuilding } from "../entities/FlagBuilding.js";
import { Transporter } from "../entities/Transporter.js";
import { MiningBuilding } from "../entities/MiningBuilding.js";
import { ResourceType } from "../enums/ResourceType.js";
import { FactoryBuilding } from "../entities/FactoryBuilding.js";
export const createStorageBuilding = (parent, id, tileX, tileY) => {
    const storageBuilding = new StorageBuilding(tileX, tileY)
        .id(id)
        .mount(parent)
        .translateToTile(tileX, tileY, 0);
    storageBuilding.flag = new FlagBuilding(tileX, tileY + 2)
        .mount(parent)
        .translateToTile(tileX, tileY + 2, 0);
    new Road(storageBuilding.id(), storageBuilding.flag.id())
        .mount(parent);
    new Transporter(storageBuilding.id(), storageBuilding.id(), storageBuilding.flag.id())
        .translateTo(storageBuilding._translate.x, storageBuilding._translate.y, 0)
        .mount(parent);
    return storageBuilding;
};
export const createMiningBuilding = (parent, id, tileX, tileY, resourceType) => {
    const miningBuilding = new MiningBuilding(tileX, tileY, resourceType, [])
        .id(id)
        .mount(parent)
        .translateToTile(tileX, tileY, 0);
    miningBuilding.flag = new FlagBuilding(tileX, tileY + 2)
        .mount(parent)
        .translateToTile(tileX, tileY + 2, 0);
    new Road(miningBuilding.id(), miningBuilding.flag.id())
        .mount(parent);
    const base = ige.$("base1");
    new Transporter(base.id(), miningBuilding.id(), miningBuilding.flag.id())
        .translateTo(base._translate.x, base._translate.y, 0)
        .mount(parent);
    return miningBuilding;
};
export const createFactoryBuilding = (parent, id, tileX, tileY) => {
    // TODO Make the produces and requires parameters of the createFactoryBuilding()
    const factoryBuilding = new FactoryBuilding(tileX, tileY, ResourceType.energy, [{
            type: ResourceType.elerium,
            count: 1,
            max: 1
        }, {
            type: ResourceType.uranium,
            count: 1,
            max: 1
        }])
        .id(id)
        .mount(parent)
        .translateToTile(tileX, tileY, 0);
    factoryBuilding.flag = new FlagBuilding(tileX, tileY + 2)
        .mount(parent)
        .translateToTile(tileX, tileY + 2, 0);
    new Road(factoryBuilding.id(), factoryBuilding.flag.id())
        .mount(parent);
    const base = ige.$("base1");
    new Transporter(base.id(), factoryBuilding.id(), factoryBuilding.flag.id())
        .translateTo(base._translate.x, base._translate.y, 0)
        .mount(parent);
    return factoryBuilding;
};
export const createFlagBuilding = (parent, id, tileX, tileY) => {
    const flagBuilding = new FlagBuilding(tileX, tileY)
        .id(id)
        .mount(parent)
        .translateToTile(tileX, tileY, 0);
    return flagBuilding;
};
