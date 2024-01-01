"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChildRotators = void 0;
const instance_1 = require("@/engine/instance");
const Rotator_1 = require("./Rotator");
const createChildRotators = (parent, distance = 120, speed = 0.1) => {
    const simpleBox = instance_1.ige.textures.get("simpleBox");
    const entity1 = new Rotator_1.Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(0, distance, 0)
        .mount(parent);
    const entity2 = new Rotator_1.Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(0, -distance, 0)
        .mount(parent);
    const entity3 = new Rotator_1.Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(-distance, 0, 0)
        .mount(parent);
    const entity4 = new Rotator_1.Rotator(speed)
        .depth(1)
        .width(50)
        .height(50)
        .texture(simpleBox)
        .scaleTo(0.5, 0.5, 0.5)
        .translateTo(distance, 0, 0)
        .mount(parent);
    return [entity1, entity2, entity3, entity4];
};
exports.createChildRotators = createChildRotators;
