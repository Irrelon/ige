"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeSceneGraph = void 0;
const IgeBaseClass_1 = require("./IgeBaseClass");
class IgeSceneGraph extends IgeBaseClass_1.IgeBaseClass {
	constructor() {
		super(...arguments);
		this.classId = "IgeSceneGraph";
	}
	/**
	 * Called when loading the graph data via ige.addGraph().
	 * @param {Object=} options The options that were passed with the call
	 * to ige.addGraph().
	 */
	addGraph(options) {}
	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph(options) {}
}
exports.IgeSceneGraph = IgeSceneGraph;
