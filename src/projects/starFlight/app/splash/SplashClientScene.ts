import { IgeAudioEntity } from "@/engine/audio/index";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import type { IgeUiManagerController } from "@/engine/core/IgeUiManagerController";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { ige } from "@/engine/instance";
import { IgeUiButton } from "@/engine/ui/IgeUiButton";
import { IgeUiDropDown } from "@/engine/ui/IgeUiDropDown";
import { IgeUiWindow } from "@/engine/ui/IgeUiWindow";
import { degreesToRadians } from "@/engine/utils";
import { IgeVelocityComponent } from "@/engine/components/IgeVelocityComponent";

export class SplashClientScene extends IgeSceneGraph {
	classId = "SplashClientScene";

	addGraph () {
		const login = async () => {
			await ige.router.go("app/space");
		};

		const fullscreen = function () {
			// Show the fullscreen dom element
			const elem = document.getElementById("fullScreenDialog");
			if (!elem) return;

			if (elem.style.display !== "block") {
				elem.style.display = "block";
			} else {
				elem.style.display = "none";
			}
		};

		const ui = ige.ui as IgeUiManagerController;

		const mainScene = ige.$("mainScene") as IgeScene2d;

		const sceneBase = new IgeScene2d().id("sceneBase").mount(mainScene);

		const backScene = new IgeScene2d().id("backScene").layer(0).mount(sceneBase);

		const uiScene = new IgeScene2d().id("uiScene").layer(1).ignoreCamera(true).mount(sceneBase);

		// Create nebula
		const nebula = new IgeEntity()
			.id("nebula")
			.layer(0)
			.texture(ige.textures.get("nebula"))
			.width(ige.engine._bounds2d.x)
			.height(ige.engine._bounds2d.y)
			.translateTo(0, 0, 0)
			.mount(backScene);

		// Create starfield
		const starfield = new IgeEntity()
			.id("starfield")
			.data("stars", 500)
			.layer(1)
			.texture(ige.textures.get("starfield"))
			.width(ige.engine._bounds2d.x)
			.height(ige.engine._bounds2d.y)
			.translateTo(0, 0, 0)
			.mount(backScene);

		new IgeUiEntity()
			.id("title")
			.texture(ige.textures.get("title"))
			.dimensionsFromTexture()
			.middle(-200)
			.mount(uiScene);

		const loginButton = new IgeUiButton()
			.id("login")
			.texture(ige.textures.get("button"))
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

		const fullscreenButton = new IgeUiButton()
			.id("fullscreen")
			.texture(ige.textures.get("button"))
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

		const irrelonButton = new IgeUiButton()
			.id("irrelon")
			.texture(ige.textures.get("irrelon"))
			.dimensionsFromTexture()
			.right(10)
			.bottom(10)
			.mount(uiScene);

		irrelonButton.pointerUp(() => {
			window.open("https://www.isogenicengine.com", "_blank");
		});

		const splashBackground = new IgeAudioEntity()
			.url("assets/audio/deepSpace.mp3")
			//.play(true)
			.mount(uiScene);

		const vp1 = ige.$("vp1") as IgeViewport;

		vp1.camera.addComponent("velocity", IgeVelocityComponent);
		(vp1.camera.components.velocity as IgeVelocityComponent).byAngleAndPower(degreesToRadians(245), 0.02);

		ui.style("#leftNav", {
			backgroundColor: "#3d3d3d",
			top: 42,
			left: 0,
			width: 225,
			bottom: 0
		});

		ui.style("#main", {
			backgroundColor: "#ffffff",
			left: 225,
			right: 0,
			top: 42,
			bottom: 0
		});

		ui.style(".white", {
			color: "#ffffff"
		});

		ui.style("IgeUiTextBox", {
			backgroundColor: "#ffffff",
			borderColor: "#212121",
			borderWidth: 1,
			bottom: null,
			right: null,
			width: 300,
			height: 30,
			left: 15,
			font: "12px Verdana",
			color: "#000000"
		});

		ui.style("#textBox1", {
			top: 140
		});

		ui.style("#textBox2", {
			top: 180
		});

		ui.style("#textBox1:focus", {
			borderColor: "#00ff00"
		});

		ui.style("#textBox2:focus", {
			borderColor: "#00ff00"
		});

		ui.style("#dashBar", {
			backgroundColor: "#eeeeee",
			top: 80,
			left: 15,
			right: 15,
			height: 40
		});

		ui.style("IgeUiLabel", {
			font: "8px Verdana"
		});

		ui.style("#homeLabel", {
			font: "14px Verdana",
			color: "#333333"
		});

		ui.style("#button1", {
			width: 80,
			height: 30,
			top: 220,
			left: 15,
			backgroundColor: "#ccc"
		});

		ui.style(".modalWindow", {
			top: "30%",
			left: "30%",
			right: "30%",
			bottom: "30%",
			backgroundColor: "#ccc"
		});

		const gameOptionsWindow = new IgeUiWindow()
			.id("window1")
			.title("Game Options")
			.titleColor("#ffffff")
			.styleClass("modalWindow")
			.layer(10)
			.mount(uiScene);

		gameOptionsWindow.on("beforeClose", function () {});

		gameOptionsWindow.hide();

		const leftNav = new IgeUiElement().id("leftNav").mount(gameOptionsWindow);

		const main = new IgeUiElement().id("main").mount(gameOptionsWindow);

		new IgeUiDropDown()
			.id("optionsDropDown")
			.top(10)
			.left(10)
			.right(10)
			.options([
				{
					text: "Test 1",
					value: "test1"
				},
				{
					text: "Test 2",
					value: "test2"
				},
				{
					text: "Test 3",
					value: "test3"
				}
			])
			.mount(leftNav);
	}

	removeGraph () {
		const sceneBase = ige.$("sceneBase") as IgeScene2d;
		if (!sceneBase) return;

		sceneBase.destroy();
	}
}
