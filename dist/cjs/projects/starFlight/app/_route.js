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
const instance_1 = require("../../../engine/instance.js");
const IgeTexture_1 = require("../../../engine/core/IgeTexture.js");
const AppClientScene_1 = require("./AppClientScene");
const AppServerScene_1 = require("./AppServerScene");
const tab_1 = require("../assets/ui/tab");
const timerCircle_1 = require("../assets/ui/timerCircle");
const infoWindow_1 = require("../assets/ui/infoWindow");
require("./space/_route");
require("./splash/_route");
instance_1.ige.router.route("app", {
	client: () =>
		__awaiter(void 0, void 0, void 0, function* () {
			// @ts-ignore
			window.ige = instance_1.ige;
			yield instance_1.ige.isReady();
			const textures = [
				new IgeTexture_1.IgeTexture("timerCircle", timerCircle_1.timerCircle),
				new IgeTexture_1.IgeTexture("infoWindow", infoWindow_1.infoWindow),
				new IgeTexture_1.IgeTexture("tab", tab_1.tab)
			];
			// Create the HTML canvas
			instance_1.ige.engine.createFrontBuffer(true);
			// Start the engine
			yield instance_1.ige.engine.start();
			// Load our level onto the scenegraph
			yield instance_1.ige.engine.addGraph(AppClientScene_1.AppClientScene);
			return () =>
				__awaiter(void 0, void 0, void 0, function* () {
					yield instance_1.ige.engine.removeGraph(AppClientScene_1.AppClientScene);
					instance_1.ige.textures.removeList(textures);
					yield instance_1.ige.engine.stop();
				});
		}),
	server: () =>
		__awaiter(void 0, void 0, void 0, function* () {
			yield instance_1.ige.isReady();
			// Start the engine
			yield instance_1.ige.engine.start();
			// Load our level onto the scenegraph
			yield instance_1.ige.engine.addGraph(AppServerScene_1.AppServerScene);
			return () =>
				__awaiter(void 0, void 0, void 0, function* () {
					yield instance_1.ige.engine.removeGraph(AppServerScene_1.AppServerScene);
					yield instance_1.ige.engine.stop();
				});
		})
});
