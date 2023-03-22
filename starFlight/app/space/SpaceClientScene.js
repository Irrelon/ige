import { ige } from "../../../engine/instance.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { IgeUiProgressBar } from "../../../engine/ui/IgeUiProgressBar.js";
import { IgeUiLabel } from "../../../engine/ui/IgeUiLabel.js";
import { IgeUiEntity } from "../../../engine/core/IgeUiEntity.js";
import { IgeEntity } from "../../../engine/core/IgeEntity.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import { InfoWindow } from "../component/ui/InfoWindow.js";
export class SpaceClientScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "SpaceClientScene";
    }
    addGraph() {
        // Set the viewport camera to 0, 0, 0
        ige.game.scene.vp1.camera
            .velocity.x(0)
            .velocity.y(0)
            .translateTo(0, 0, 0);
        ige.game.scene.sceneBase = new IgeScene2d()
            .id("sceneBase")
            .mount(ige.game.scene.mainScene);
        ige.game.scene.backScene = new IgeScene2d()
            .id("backScene")
            .layer(0)
            .mount(ige.game.scene.sceneBase);
        ige.game.scene.middleScene = new IgeScene2d()
            .id("middleScene")
            .layer(1)
            .mount(ige.game.scene.sceneBase);
        ige.game.scene.frontScene = new IgeScene2d()
            .id("frontScene")
            .layer(2)
            .mount(ige.game.scene.sceneBase);
        ige.game.scene.uiScene = new IgeScene2d()
            .id("uiScene")
            .layer(3)
            .ignoreCamera(true)
            .mount(ige.game.scene.sceneBase);
        ige.game.scene.stateBar = {};
        ige.game.scene.stateBar.fuel = new IgeUiProgressBar()
            .id("stateBar_fuel")
            .top(10)
            .right(10)
            .width(200)
            .height(15)
            .barBackColor("#08343f")
            .barColor("#dea927")
            .barText("FUEL: ", "%", "#ffffff", true)
            .mount(ige.game.scene.uiScene);
        ige.game.scene.stateBar.energy = new IgeUiProgressBar()
            .id("stateBar_energy")
            .top(30)
            .right(10)
            .width(200)
            .height(15)
            .barBackColor("#08343f")
            .barColor("#28b8db")
            .barText("ENERGY: ", "%", "#ffffff", true)
            .mount(ige.game.scene.uiScene);
        ige.game.scene.stateBar.shield = new IgeUiProgressBar()
            .id("stateBar_shield")
            .top(50)
            .right(10)
            .width(200)
            .height(15)
            .barBackColor("#08343f")
            .barColor("#c27aef")
            .barText("SHIELD: ", "%", "#ffffff", true)
            .mount(ige.game.scene.uiScene);
        ige.game.scene.stateBar.integrity = new IgeUiProgressBar()
            .id("stateBar_integrity")
            .top(70)
            .right(10)
            .width(200)
            .height(15)
            .barBackColor("#08343f")
            .barColor("#ef7a7a")
            .barText("INTEGRITY: ", "%", "#ffffff", true)
            .mount(ige.game.scene.uiScene);
        ige.game.scene.stateBar.inventorySpace = new IgeUiProgressBar()
            .id("stateBar_inventorySpace")
            .top(90)
            .right(10)
            .width(200)
            .height(15)
            .barBackColor("#08343f")
            .barColor("#57a251")
            .barText("#ffffff", (val, total) => {
            return "CARGO: " + val + " of " + total;
        })
            .mount(ige.game.scene.uiScene);
        // Create nebula
        ige.game.scene.nebula = new IgeEntity()
            .id("nebula")
            .layer(0)
            .texture(ige.textures.get("nebula"))
            .width(1600)
            .height(1600)
            .translateTo(0, 0, 0)
            .mount(ige.game.scene.backScene);
        // Create starfield
        ige.game.scene.starfield = new IgeEntity()
            .id("starfield")
            .layer(1)
            .texture(ige.textures.get("starfield"))
            .width(1600)
            .height(1600)
            .translateTo(0, 0, 0)
            .mount(ige.game.scene.backScene);
        ige.game.scene.targetInfo = new InfoWindow({
            tab: {
                width: 80,
                position: "top",
                label: "TARGET DATA",
                tweenDefault: 10
            }
        })
            .id("targetInfo")
            .width(200)
            .height(150)
            .bottom(10)
            .left(10)
            .mount(ige.game.scene.uiScene);
        new IgeUiLabel()
            .id("targetDistance")
            .layer(1)
            .font("10px Verdana")
            .width(ige.game.scene.targetInfo.width())
            .height(20)
            .left(5)
            .top(5)
            .textAlignX(0)
            .textAlignY(1)
            .textLineSpacing(20)
            .color("#f4f4f4")
            .value("Distance: No Target")
            .mount(ige.game.scene.targetInfo);
        ige.game.scene.radar = new IgeUiEntity()
            .id("radar")
            .layer(1)
            .texture(ige.textures.get("radar"))
            .width(330)
            .height(170)
            .bottom(13)
            .right(13)
            .mount(ige.game.scene.uiScene);
        ige.game.scene.windowLocalScan = new IgeUiEntity()
            .id("windowLocalScan")
            .layer(0)
            .texture(ige.textures.get("windowLocalScan"))
            .dimensionsFromTexture()
            .bottom(-20)
            .right(-20)
            .mount(ige.game.scene.uiScene);
        ige.game.scene.messageWindow = new MessageWindow({
            messageFont: "12px Verdana",
            messageColor: "#ffffff",
            tab: {
                width: 80,
                position: "bottom",
                label: "MESSAGE LOG",
                tweenDefault: 10
            }
        })
            .id("messageWindow")
            .width(400)
            .height(150)
            .top(10)
            .left(70)
            .mount(ige.game.scene.uiScene);
        ige.audio.register("select", "assets/audio/select.wav");
        ige.audio.register("miningLaser", "assets/audio/miningLaser.wav");
        ige.audio.register("actionDenied", "assets/audio/actionDenied.wav");
        ige.audio.register("actionAllowed", "assets/audio/actionAllowed.wav");
        ige.audio.register("actionComplete", "assets/audio/actionComplete.wav");
    }
    removeGraph() {
        let i;
        if (ige.engine.$("sceneBase")) {
            ige.engine.$("sceneBase").destroy();
            // Clear any references
            for (i in ige.game.scene) {
                if (ige.game.scene.hasOwnProperty(i)) {
                    if (!ige.game.scene[i].alive()) {
                        delete ige.game.scene[i];
                    }
                }
            }
        }
    }
}
