"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiRequiresProducesDisplay = void 0;
const instance_1 = require("@/engine/instance");
const ResourceType_1 = require("../enums/ResourceType");
const IgeUiEntity_1 = require("@/engine/core/IgeUiEntity");
class UiRequiresProducesDisplay extends IgeUiEntity_1.IgeUiEntity {
    constructor(produces, requires = []) {
        super();
        this._requiredResourceUiEntity = [];
        this.drawBounds(false)
            .width(200)
            .height(20)
            .translateBy(0, -50, 0)
            .scaleTo(0.8, 0.8, 0.8);
        requires.forEach((requiresItem, index) => {
            this._requiredResourceUiEntity.push(new IgeUiEntity_1.IgeUiEntity()
                .texture(instance_1.ige.textures.get(requiresItem.type))
                .center((-20 * (index + 1) - 10))
                .width(30)
                .height(30)
                .mount(this));
        });
        if (produces !== ResourceType_1.ResourceType.none) {
            new IgeUiEntity_1.IgeUiEntity()
                .texture(instance_1.ige.textures.get("arrow"))
                .width(20)
                .height(15)
                .mount(this);
            new IgeUiEntity_1.IgeUiEntity()
                .texture(instance_1.ige.textures.get(produces))
                .center(30)
                .width(30)
                .height(30)
                .mount(this);
        }
    }
}
exports.UiRequiresProducesDisplay = UiRequiresProducesDisplay;
