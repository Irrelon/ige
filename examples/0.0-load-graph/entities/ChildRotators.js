import { ige } from "../../../engine/instance.js";
import { Rotator } from "./Rotator.js";
import { textures } from "../services/textures.js";
export const createChildRotators = (parent, distance = 120, speed = 0.1) => {
    const client = ige.client;
    const simpleBox = textures.getTextureById("simpleBox");
    const entity1 = new Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(0, distance, 0)
        .mount(parent);
    const entity2 = new Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(0, -distance, 0)
        .mount(parent);
    const entity3 = new Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(-distance, 0, 0)
        .mount(parent);
    const entity4 = new Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(distance, 0, 0)
        .mount(parent);
    return [entity1, entity2, entity3, entity4];
};
