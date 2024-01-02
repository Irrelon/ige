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
exports.AppServerScene = void 0;
const instance_1 = require("../../../engine/instance.js");
const IgeBaseScene_1 = require("../../../engine/core/IgeBaseScene.js");
const IgeOptions_1 = require("../../../engine/core/IgeOptions.js");
const IgeSceneGraph_1 = require("../../../engine/core/IgeSceneGraph.js");
class AppServerScene extends IgeSceneGraph_1.IgeSceneGraph {
	constructor() {
		super(...arguments);
		this.classId = "AppServerScene";
	}
	addGraph() {
		return __awaiter(this, void 0, void 0, function* () {
			const options = new IgeOptions_1.IgeOptions();
			options.set("masterVolume", 1);
			const network = instance_1.ige.network;
			// Start the engine
			yield instance_1.ige.engine.start();
			// Load the base scene data
			yield instance_1.ige.engine.addGraph(IgeBaseScene_1.IgeBaseScene);
			network.sendInterval(30); // Send a stream update once every 30 milliseconds
			yield network.start(2000);
			network.acceptConnections(true);
		});
	}
	removeGraph() {
		const network = instance_1.ige.network;
		network.stop();
		instance_1.ige.engine.stop();
	}
}
exports.AppServerScene = AppServerScene;
