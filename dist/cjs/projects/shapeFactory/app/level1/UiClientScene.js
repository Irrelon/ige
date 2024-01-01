"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiClientScene = void 0;
const instance_1 = require("../../../../engine/instance.js");
const IgeSceneGraph_1 = require("../../../../engine/core/IgeSceneGraph.js");
const IgeScene2d_1 = require("../../../../engine/core/IgeScene2d.js");
const IgeUiElement_1 = require("../../../../engine/core/IgeUiElement.js");
const ResourceType_1 = require("../../enums/ResourceType");
const resource_1 = require("../../services/resource");
const UiBuildItem_1 = require("../../entities/base/UiBuildItem");
class UiClientScene extends IgeSceneGraph_1.IgeSceneGraph {
    addGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            const baseScene = instance_1.ige.$("baseScene");
            const uiScene = new IgeScene2d_1.IgeScene2d()
                .id("uiScene")
                .layer(1)
                .ignoreCamera(true)
                .mount(baseScene);
            const buildUi = new IgeUiElement_1.IgeUiElement()
                .left(0)
                .middle(0)
                .width(80)
                .height(500)
                .borderWidth(1)
                .borderColor("#ffffff")
                .backgroundColor("#222222")
                .mount(uiScene);
            new UiBuildItem_1.UiBuildItem(instance_1.ige.textures.get("headquarters"), "Headquarters")
                .id("uiCreateStorage")
                .top(20)
                .mount(buildUi);
            new UiBuildItem_1.UiBuildItem(instance_1.ige.textures.get("factory1"), "Factory 1")
                .id("uiCreateFactory1")
                .top(90)
                .mount(buildUi);
            new UiBuildItem_1.UiBuildItem(instance_1.ige.textures.get("factory2"), "Factory 2")
                .id("uiCreateFactory2")
                .top(160)
                .mount(buildUi);
            new UiBuildItem_1.UiBuildItem(instance_1.ige.textures.get("mine"), "Green Mine")
                .id("uiCreateMine1")
                .data("fillColor", resource_1.fillColorByResourceType[ResourceType_1.ResourceType.wood])
                .top(230)
                .mount(buildUi);
            new UiBuildItem_1.UiBuildItem(instance_1.ige.textures.get("mine"), "Purple Mine")
                .id("uiCreateMine2")
                .data("fillColor", resource_1.fillColorByResourceType[ResourceType_1.ResourceType.stone])
                .top(300)
                .mount(buildUi);
            new UiBuildItem_1.UiBuildItem(instance_1.ige.textures.get("house1"), "House 1")
                .id("uiCreateHouse1")
                .top(370)
                .height(50)
                .mount(buildUi);
        });
    }
    removeGraph() {
        var _a;
        (_a = instance_1.ige.$("uiScene")) === null || _a === void 0 ? void 0 : _a.destroy();
    }
}
exports.UiClientScene = UiClientScene;
