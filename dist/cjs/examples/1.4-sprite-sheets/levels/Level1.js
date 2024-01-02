"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Level1 = void 0;
const instance_1 = require("../../../engine/instance.js");
const IgeSceneGraph_1 = require("../../../engine/core/IgeSceneGraph.js");
const IgeEntity_1 = require("../../../engine/core/IgeEntity.js");
const IgeTextureAnimationComponent_1 = require("../../../engine/components/IgeTextureAnimationComponent.js");
class Level1 extends IgeSceneGraph_1.IgeSceneGraph {
	constructor() {
		super(...arguments);
		this.classId = "Level1";
	}
	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph() {
		const baseScene = instance_1.ige.$("baseScene");
		new IgeEntity_1.IgeEntity()
			.id("sprite1")
			.depth(1)
			// Assign the sprite sheet texture to the entity
			.texture(instance_1.ige.textures.get("sci-fi-tiles1"))
			// Assign cell 1 as the entity's texture cell
			.cell(1)
			// Apply the dimensions from the cell to the entity
			// so that the entity's width and height now match that
			// of the cell being used
			.dimensionsFromCell()
			.translateTo(0, -100, 0)
			.mount(baseScene);
		new IgeEntity_1.IgeEntity()
			.id("sprite2")
			.depth(1)
			// Assign the sprite sheet texture to the entity.
			// Notice we are using the gameTexture[1] instead of the
			// gameTexture[0] as in the entity above. This allows us
			// to use the cell ids that were defined via the
			// IgeSpriteSheet definition on line 20 using cellById()
			// instead of specifying the cell index via cell()
			.texture(instance_1.ige.textures.get("sci-fi-tiles2"))
			// Assign cell by id "panel" as the entity's texture cell
			// this is possible using the cellById() method which reads
			// the assigned cell ids from the texture definition and
			// then maps it to the cell index that it corresponds to
			.cellById("panel")
			// Apply the dimensions from the cell to the entity
			// so that the entity's width and height now match that
			// of the cell being used
			.dimensionsFromCell()
			.translateTo(100, -100, 0)
			.mount(baseScene);
		// Create one more entity and animate between the table and
		// panel cells using cell ids in the animation, this tests
		// that cell-id based frames will animate correctly
		const sprite3 = new IgeEntity_1.IgeEntity()
			.id("sprite3")
			.addComponent("animation", IgeTextureAnimationComponent_1.IgeTextureAnimationComponent)
			.depth(1)
			// Assign the sprite sheet texture to the entity.
			// Notice we are using the gameTexture[1] instead of the
			// gameTexture[0] as in the entity above. This allows us
			// to use the cell ids that were defined via the
			// IgeSpriteSheet definition on line 20 using cellById()
			// instead of specifying the cell index via cell()
			.texture(instance_1.ige.textures.get("sci-fi-tiles2"))
			// Assign cell by id "panel" as the entity's texture cell
			// this is possible using the cellById() method which reads
			// the assigned cell ids from the texture definition and
			// then maps it to the cell index that it corresponds to
			.cellById("panel")
			// Apply the dimensions from the cell to the entity
			// so that the entity's width and height now match that
			// of the cell being used
			.dimensionsFromCell()
			.translateTo(100, 0, 0);
		sprite3.components.animation.define("test", ["panel", "table", null], 1, -1, true);
		sprite3.components.animation.select("test");
		sprite3.mount(baseScene);
		// Create a new separate texture from the cell of one of the sprite sheets!
		const sciFiTiles3 = instance_1.ige.textures.get("sci-fi-tiles2").textureFromCell("panel");
		const shrubbery = instance_1.ige.textures.get("shrubbery");
		// Create another entity using the new texture
		new IgeEntity_1.IgeEntity()
			.id("sprite4")
			.texture(sciFiTiles3)
			.dimensionsFromTexture()
			.translateTo(-100, 0, 0)
			.mount(baseScene);
		let xAdj = 0;
		for (let i = 1; i < shrubbery.cellCount(); i++) {
			if (i > 1) {
				xAdj += shrubbery._cells[i][2] / 2;
			}
			new IgeEntity_1.IgeEntity()
				.texture(shrubbery)
				.cell(i)
				.dimensionsFromCell()
				.translateTo(0 + xAdj, 180, 0)
				.mount(baseScene);
			xAdj += shrubbery._cells[i][2] / 2 + 5;
		}
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
	}
}
exports.Level1 = Level1;
