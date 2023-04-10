var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../../engine/instance.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import { IgeUiElement } from "../../../engine/core/IgeUiElement.js";
import { ResourceType } from "../../enums/ResourceType.js";
import { fillColorByResourceType } from "../../services/resource.js";
import { UiBuildItem } from "../../entities/base/UiBuildItem.js";
export class UiClientScene extends IgeSceneGraph {
    addGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            const baseScene = ige.$("baseScene");
            const uiScene = new IgeScene2d()
                .id("uiScene")
                .layer(1)
                .ignoreCamera(true)
                .mount(baseScene);
            const buildUi = new IgeUiElement()
                .left(0)
                .middle(0)
                .width(80)
                .height(500)
                .borderWidth(1)
                .borderColor("#ffffff")
                .backgroundColor("#222222")
                .mount(uiScene);
            new UiBuildItem(ige.textures.get("headquarters"), "Headquarters")
                .id("uiCreateStorage")
                .top(20)
                .mount(buildUi);
            new UiBuildItem(ige.textures.get("factory1"), "Factory 1")
                .id("uiCreateFactory1")
                .top(90)
                .mount(buildUi);
            new UiBuildItem(ige.textures.get("factory2"), "Factory 2")
                .id("uiCreateFactory2")
                .top(160)
                .mount(buildUi);
            new UiBuildItem(ige.textures.get("mine"), "Green Mine")
                .id("uiCreateMine1")
                .data("fillColor", fillColorByResourceType[ResourceType.wood])
                .top(230)
                .mount(buildUi);
            new UiBuildItem(ige.textures.get("mine"), "Purple Mine")
                .id("uiCreateMine2")
                .data("fillColor", fillColorByResourceType[ResourceType.stone])
                .top(300)
                .mount(buildUi);
            // new UiBuildItem(ige.textures.get("flagSmartTexture"), "Flag")
            // 	.id("uiCreateFlag")
            // 	.top(370)
            // 	.mount(buildUi);
        });
    }
    removeGraph() {
        var _a;
        (_a = ige.$("uiScene")) === null || _a === void 0 ? void 0 : _a.destroy();
    }
}
