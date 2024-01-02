"use strict";
var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceClientScene = void 0;
const instance_1 = require("../../../../engine/instance.js");
const IgeSceneGraph_1 = require("../../../../engine/core/IgeSceneGraph.js");
const IgeUiProgressBar_1 = require("../../../../engine/ui/IgeUiProgressBar.js");
const IgeUiLabel_1 = require("../../../../engine/ui/IgeUiLabel.js");
const IgeUiEntity_1 = require("../../../../engine/core/IgeUiEntity.js");
const IgeEntity_1 = require("../../../../engine/core/IgeEntity.js");
const IgeScene2d_1 = require("../../../../engine/core/IgeScene2d.js");
const InfoWindow_1 = require("../component/ui/InfoWindow");
class SpaceClientScene extends IgeSceneGraph_1.IgeSceneGraph {
	constructor() {
		super();
		this.classId = "SpaceClientScene";
		this.publicGameData = {
			modules: {}
		};
		// Show the connecting dialog
		const connectingDialog = document.getElementById("connectingDialog");
		if (connectingDialog) {
			connectingDialog.style.display = "block";
		}
	}
	addGraph() {
		return __awaiter(this, void 0, void 0, function* () {
			const network = instance_1.ige.network;
			// Hook network events we want to respond to
			network.define("playerEntity", this._onPlayerEntity.bind(this));
			// Start the network client
			yield network.start("http://" + window.location.hostname + ":2000");
			// Set up the network stream handler
			network.renderLatency(80); // Render the simulation 80 milliseconds in the past
			// Ask server for game data
			network.send("publicGameData", null, (data) => {
				if (!data) {
					network.stop();
					console.log("Game error, publicGameData not returned");
					return;
				}
				this.publicGameData = data;
				// Ask the server to create an entity for us
				network.send("playerEntity");
			});
			const vp1 = instance_1.ige.$("vp1");
			// Set the viewport camera to 0, 0, 0
			const velocity = vp1.camera.components.velocity;
			velocity.x(0);
			velocity.y(0);
			vp1.camera.translateTo(0, 0, 0);
			const mainScene = instance_1.ige.$("mainScene");
			const sceneBase = new IgeScene2d_1.IgeScene2d().id("sceneBase").mount(mainScene);
			const backScene = new IgeScene2d_1.IgeScene2d().id("backScene").layer(0).mount(sceneBase);
			const middleScene = new IgeScene2d_1.IgeScene2d().id("middleScene").layer(1).mount(sceneBase);
			const frontScene = new IgeScene2d_1.IgeScene2d().id("frontScene").layer(2).mount(sceneBase);
			const uiScene = new IgeScene2d_1.IgeScene2d().id("uiScene").layer(3).ignoreCamera(true).mount(sceneBase);
			const stateBar = {};
			stateBar.fuel = new IgeUiProgressBar_1.IgeUiProgressBar()
				.id("stateBar_fuel")
				.top(10)
				.right(10)
				.width(200)
				.height(15)
				.barBackColor("#08343f")
				.barColor("#dea927")
				.barText("FUEL: ", "%", "#ffffff", true)
				.mount(uiScene);
			stateBar.energy = new IgeUiProgressBar_1.IgeUiProgressBar()
				.id("stateBar_energy")
				.top(30)
				.right(10)
				.width(200)
				.height(15)
				.barBackColor("#08343f")
				.barColor("#28b8db")
				.barText("ENERGY: ", "%", "#ffffff", true)
				.mount(uiScene);
			stateBar.shield = new IgeUiProgressBar_1.IgeUiProgressBar()
				.id("stateBar_shield")
				.top(50)
				.right(10)
				.width(200)
				.height(15)
				.barBackColor("#08343f")
				.barColor("#c27aef")
				.barText("SHIELD: ", "%", "#ffffff", true)
				.mount(uiScene);
			stateBar.integrity = new IgeUiProgressBar_1.IgeUiProgressBar()
				.id("stateBar_integrity")
				.top(70)
				.right(10)
				.width(200)
				.height(15)
				.barBackColor("#08343f")
				.barColor("#ef7a7a")
				.barText("INTEGRITY: ", "%", "#ffffff", true)
				.mount(uiScene);
			stateBar.inventorySpace = new IgeUiProgressBar_1.IgeUiProgressBar()
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
				.mount(uiScene);
			// Create nebula
			const nebula = new IgeEntity_1.IgeEntity()
				.id("nebula")
				.layer(0)
				.texture(instance_1.ige.textures.get("nebula"))
				.width(1600)
				.height(1600)
				.translateTo(0, 0, 0)
				.mount(backScene);
			// Create starfield
			const starfield = new IgeEntity_1.IgeEntity()
				.id("starfield")
				.layer(1)
				.texture(instance_1.ige.textures.get("starfield"))
				.width(1600)
				.height(1600)
				.translateTo(0, 0, 0)
				.mount(backScene);
			const targetInfo = new InfoWindow_1.InfoWindow({
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
				.mount(uiScene);
			new IgeUiLabel_1.IgeUiLabel()
				.id("targetDistance")
				.layer(1)
				.font("10px Verdana")
				.width(targetInfo.width())
				.height(20)
				.left(5)
				.top(5)
				.textAlignX(0)
				.textAlignY(1)
				.textLineSpacing(20)
				.color("#f4f4f4")
				.value("Distance: No Target")
				.mount(targetInfo);
			const radar = new IgeUiEntity_1.IgeUiEntity()
				.id("radar")
				.layer(1)
				.texture(instance_1.ige.textures.get("radar"))
				.width(330)
				.height(170)
				.bottom(13)
				.right(13)
				.mount(uiScene);
			const windowLocalScan = new IgeUiEntity_1.IgeUiEntity()
				.id("windowLocalScan")
				.layer(0)
				.texture(instance_1.ige.textures.get("windowLocalScan"))
				.dimensionsFromTexture()
				.bottom(-20)
				.right(-20)
				.mount(uiScene);
			// const messageWindow = new MessageWindow({
			// 	messageFont: "12px Verdana",
			// 	messageColor: "#ffffff",
			// 	tab: {
			// 		width: 80,
			// 		position: "bottom",
			// 		label: "MESSAGE LOG",
			// 		tweenDefault: 10
			// 	}
			// })
			// 	.id("messageWindow")
			// 	.width(400)
			// 	.height(150)
			// 	.top(10)
			// 	.left(70)
			// 	.mount(uiScene);
			const audio = instance_1.ige.audio;
			audio.register("select", "assets/audio/select.wav");
			audio.register("miningLaser", "assets/audio/miningLaser.wav");
			audio.register("actionDenied", "assets/audio/actionDenied.wav");
			audio.register("actionAllowed", "assets/audio/actionAllowed.wav");
			audio.register("actionComplete", "assets/audio/actionComplete.wav");
		});
	}
	removeGraph() {
		const sceneBase = instance_1.ige.$("sceneBase");
		sceneBase === null || sceneBase === void 0 ? void 0 : sceneBase.destroy();
	}
	/**
	 * Called when the client receives a message from the server that it has
	 * created an entity for our player, sending us the entity id so we can
	 * keep track of our own player entity.
	 * @param {String} entityId The id of our player entity.
	 * @private
	 */
	_onPlayerEntity(entityId) {
		const ent = instance_1.ige.$(entityId);
		if (ent) {
			this._trackPlayerEntity(ent);
			return;
		}
		const network = instance_1.ige.network;
		// The client has not yet received the entity via the network
		// stream so lets ask the stream to tell us when it creates a
		// new entity and then check if that entity is the one we
		// should be tracking!
		const listener = (entity) => {
			if (entity.id() === entityId) {
				this._trackPlayerEntity(instance_1.ige.$(entityId));
				// Turn off the listener for this event now that we
				// have found and started tracking our player entity
				network.off("entityCreated", listener);
			}
		};
		network.on("entityCreated", listener);
	}
	/**
	 * Sets up camera tracking for our player entity.
	 * @param {IgeEntity} ent Our player entity to track.
	 * @private
	 */
	_trackPlayerEntity(ent) {
		// Store the player entity reference
		instance_1.ige.app.playerEntity = ent;
		// Tell the camera to track this entity with some elasticity
		const vp1 = instance_1.ige.$("vp1");
		if (vp1) {
			vp1.camera.trackTranslate(ent, 8);
		}
		// Hide connection dialog now that the player can do something
		const connectingDialog = document.getElementById("connectingDialog");
		if (connectingDialog) {
			connectingDialog.style.display = "none";
		}
	}
}
exports.SpaceClientScene = SpaceClientScene;
