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
exports.SplashClientScene = void 0;
const instance_1 = require("@/engine/instance");
const IgeVelocityComponent_1 = require("@/engine/components/IgeVelocityComponent");
const IgeUiEntity_1 = require("@/engine/core/IgeUiEntity");
const index_1 = require("@/engine/audio/index");
const IgeUiWindow_1 = require("@/engine/ui/IgeUiWindow");
const IgeUiButton_1 = require("@/engine/ui/IgeUiButton");
const IgeUiElement_1 = require("@/engine/core/IgeUiElement");
const IgeUiDropDown_1 = require("@/engine/ui/IgeUiDropDown");
const IgeEntity_1 = require("@/engine/core/IgeEntity");
const IgeScene2d_1 = require("@/engine/core/IgeScene2d");
const utils_1 = require("@/engine/utils");
const IgeSceneGraph_1 = require("@/engine/core/IgeSceneGraph");
class SplashClientScene extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "SplashClientScene";
    }
    addGraph() {
        const login = () => __awaiter(this, void 0, void 0, function* () {
            yield instance_1.ige.router.go("app/space");
        });
        const fullscreen = function () {
            // Show the fullscreen dom element
            const elem = document.getElementById("fullScreenDialog");
            if (!elem)
                return;
            if (elem.style.display !== "block") {
                elem.style.display = "block";
            }
            else {
                elem.style.display = "none";
            }
        };
        const ui = instance_1.ige.ui;
        const mainScene = instance_1.ige.$("mainScene");
        const sceneBase = new IgeScene2d_1.IgeScene2d()
            .id("sceneBase")
            .mount(mainScene);
        const backScene = new IgeScene2d_1.IgeScene2d()
            .id("backScene")
            .layer(0)
            .mount(sceneBase);
        const uiScene = new IgeScene2d_1.IgeScene2d()
            .id("uiScene")
            .layer(1)
            .ignoreCamera(true)
            .mount(sceneBase);
        // Create nebula
        const nebula = new IgeEntity_1.IgeEntity()
            .id("nebula")
            .layer(0)
            .texture(instance_1.ige.textures.get("nebula"))
            .width(instance_1.ige.engine._bounds2d.x)
            .height(instance_1.ige.engine._bounds2d.y)
            .translateTo(0, 0, 0)
            .mount(backScene);
        // Create starfield
        const starfield = new IgeEntity_1.IgeEntity()
            .id("starfield")
            .data("stars", 500)
            .layer(1)
            .texture(instance_1.ige.textures.get("starfield"))
            .width(instance_1.ige.engine._bounds2d.x)
            .height(instance_1.ige.engine._bounds2d.y)
            .translateTo(0, 0, 0)
            .mount(backScene);
        new IgeUiEntity_1.IgeUiEntity()
            .id("title")
            .texture(instance_1.ige.textures.get("title"))
            .dimensionsFromTexture()
            .middle(-200)
            .mount(uiScene);
        const loginButton = new IgeUiButton_1.IgeUiButton()
            .id("login")
            .texture(instance_1.ige.textures.get("button"))
            .width(120)
            .height(40)
            .middle(-100)
            .data("ui", {
            border: "#ffffff",
            text: {
                value: "LOGIN"
            }
        })
            .mount(uiScene);
        loginButton.pointerOver(() => {
            const uiData = loginButton.data("ui");
            uiData.fill = {
                color: "rgba(0, 174, 255, 0.2)"
            };
        });
        loginButton.pointerOut(() => {
            const uiData = loginButton.data("ui");
            delete uiData.fill;
        });
        loginButton.pointerUp(() => {
            void login();
        });
        const fullscreenButton = new IgeUiButton_1.IgeUiButton()
            .id("fullscreen")
            .texture(instance_1.ige.textures.get("button"))
            .width(100)
            .height(30)
            .right(10)
            .top(10)
            .data("ui", {
            border: "#ffffff",
            text: {
                value: "FULLSCREEN"
            }
        })
            .mount(uiScene);
        fullscreenButton.pointerOver(() => {
            const uiData = fullscreenButton.data("ui");
            uiData.fill = {
                color: "rgba(0, 174, 255, 0.2)"
            };
        });
        fullscreenButton.pointerOut(() => {
            const uiData = fullscreenButton.data("ui");
            delete uiData.fill;
        });
        fullscreenButton.pointerUp(() => {
            fullscreen();
        });
        const irrelonButton = new IgeUiButton_1.IgeUiButton()
            .id("irrelon")
            .texture(instance_1.ige.textures.get("irrelon"))
            .dimensionsFromTexture()
            .right(10)
            .bottom(10)
            .mount(uiScene);
        irrelonButton.pointerUp(() => {
            window.open("https://www.isogenicengine.com", "_blank");
        });
        const splashBackground = new index_1.IgeAudioEntity()
            .url("assets/audio/deepSpace.mp3")
            //.play(true)
            .mount(uiScene);
        const vp1 = instance_1.ige.$("vp1");
        vp1.camera.addComponent("velocity", IgeVelocityComponent_1.IgeVelocityComponent);
        vp1.camera.components.velocity.byAngleAndPower((0, utils_1.degreesToRadians)(245), 0.02);
        ui.style("#leftNav", {
            "backgroundColor": "#3d3d3d",
            "top": 42,
            "left": 0,
            "width": 225,
            "bottom": 0
        });
        ui.style("#main", {
            "backgroundColor": "#ffffff",
            "left": 225,
            "right": 0,
            "top": 42,
            "bottom": 0
        });
        ui.style(".white", {
            "color": "#ffffff"
        });
        ui.style("IgeUiTextBox", {
            "backgroundColor": "#ffffff",
            "borderColor": "#212121",
            "borderWidth": 1,
            "bottom": null,
            "right": null,
            "width": 300,
            "height": 30,
            "left": 15,
            "font": "12px Verdana",
            "color": "#000000"
        });
        ui.style("#textBox1", {
            "top": 140
        });
        ui.style("#textBox2", {
            "top": 180
        });
        ui.style("#textBox1:focus", {
            "borderColor": "#00ff00"
        });
        ui.style("#textBox2:focus", {
            "borderColor": "#00ff00"
        });
        ui.style("#dashBar", {
            "backgroundColor": "#eeeeee",
            "top": 80,
            "left": 15,
            "right": 15,
            "height": 40
        });
        ui.style("IgeUiLabel", {
            "font": "8px Verdana"
        });
        ui.style("#homeLabel", {
            "font": "14px Verdana",
            "color": "#333333"
        });
        ui.style("#button1", {
            "width": 80,
            "height": 30,
            "top": 220,
            "left": 15,
            "backgroundColor": "#ccc"
        });
        ui.style(".modalWindow", {
            "top": "30%",
            "left": "30%",
            "right": "30%",
            "bottom": "30%",
            "backgroundColor": "#ccc"
        });
        const gameOptionsWindow = new IgeUiWindow_1.IgeUiWindow()
            .id("window1")
            .title("Game Options")
            .titleColor("#ffffff")
            .styleClass("modalWindow")
            .layer(10)
            .mount(uiScene);
        gameOptionsWindow.on("beforeClose", function () {
        });
        gameOptionsWindow.hide();
        const leftNav = new IgeUiElement_1.IgeUiElement()
            .id("leftNav")
            .mount(gameOptionsWindow);
        const main = new IgeUiElement_1.IgeUiElement()
            .id("main")
            .mount(gameOptionsWindow);
        new IgeUiDropDown_1.IgeUiDropDown()
            .id("optionsDropDown")
            .top(10)
            .left(10)
            .right(10)
            .options([{
                text: "Test 1",
                value: "test1"
            }, {
                text: "Test 2",
                value: "test2"
            }, {
                text: "Test 3",
                value: "test3"
            }])
            .mount(leftNav);
    }
    removeGraph() {
        const sceneBase = instance_1.ige.$("sceneBase");
        if (!sceneBase)
            return;
        sceneBase.destroy();
    }
}
exports.SplashClientScene = SplashClientScene;
