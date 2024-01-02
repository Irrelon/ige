"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Level1Scene = void 0;
const instance_1 = require("../../../../engine/instance.js");
const IgeSceneGraph_1 = require("../../../../engine/core/IgeSceneGraph.js");
const IgeScene2d_1 = require("../../../../engine/core/IgeScene2d.js");
const Fairy_1 = require("../../entities/Fairy");
const IgeUiButton_1 = require("../../../../engine/ui/IgeUiButton.js");
class Level1Scene extends IgeSceneGraph_1.IgeSceneGraph {
	constructor() {
		super(...arguments);
		this.classId = "Level1Scene";
	}
	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph() {
		const baseScene = instance_1.ige.$("baseScene");
		// Clear existing graph data
		if (instance_1.ige.$("scene1")) {
			this.removeGraph();
		}
		// Create the scene
		const scene1 = new IgeScene2d_1.IgeScene2d().id("scene1").layer(0).mount(baseScene);
		const uiScene = new IgeScene2d_1.IgeScene2d().id("uiScene").layer(1).mount(baseScene);
		// Create an entity and mount it to the scene
		new Fairy_1.Fairy(-0.01).translateTo(-220, 0, 0).mount(scene1);
		new Fairy_1.Fairy(0.01).translateTo(220, 0, 0).mount(scene1);
		new IgeUiButton_1.IgeUiButton()
			.width(100)
			.height(40)
			.color("#ffffff")
			.backgroundColor("#002b4b")
			.borderColor("#ffffff")
			.borderWidth(1)
			.value("Back to Splash")
			.pointerUp(() => {
				instance_1.ige.router.go("app/splash");
			})
			.mount(uiScene);
	}
	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph() {
		// Since all our objects in addGraph() were mounted to the
		// 'scene1' entity, destroying it will remove everything we
		// added to it.
		instance_1.ige.$("scene1").destroy();
		instance_1.ige.$("uiScene").destroy();
	}
}
exports.Level1Scene = Level1Scene;
