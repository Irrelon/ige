import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { IgeStreamMode } from "@/enums/IgeStreamMode";
import { ResourceType } from "../../enums/ResourceType";
import { IgeAudioEntity } from "@/engine/audio";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { Road } from "../../entities/Road";
import { Transporter } from "../../entities/Transporter";
import { createFactoryBuilding, createMiningBuilding, createStorageBuilding } from "../../services/createBuilding";

export class Level1 extends IgeSceneGraph {
	classId = "Level1";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph () {
		const baseScene = ige.$("baseScene") as IgeScene2d;

		// Clear existing graph data
		if (ige.$("scene1")) {
			this.removeGraph();
		}

		// Create the scene
		const scene1 = new IgeScene2d()
			.id("scene1")
			//.isometricMounts(true)
			.mount(baseScene);

		if (isClient) {
			console.log("Client mode");
		}
		if (isClient) return;

		new IgeAudioEntity()
			.streamMode(IgeStreamMode.simple)
			.url("assets/audio/deepSpace.mp3")
			.play(true)
			.mount(baseScene);

		const base = createStorageBuilding(scene1, "base1", -100, -80);
		const miningBuilding1 = createMiningBuilding(scene1, "miningBuilding1", 50, 150, ResourceType.wood);
		const miningBuilding2 = createMiningBuilding(scene1, "miningBuilding2", 250, -150, ResourceType.grain);
		const factoryBuilding1 = createFactoryBuilding(scene1, "factoryBuilding1", 220, 120);
		const factoryBuilding2 = createFactoryBuilding(scene1, "factoryBuilding2", -220, 120);

		///////////////////////////////////////////////////////////

		new Road(base.flag.id(), factoryBuilding1.flag.id())
			.mount(scene1);

		new Road(base.flag.id(), factoryBuilding2.flag.id())
			.mount(scene1);

		new Road(base.flag.id(), miningBuilding2.flag.id())
			.mount(scene1);

		new Road(factoryBuilding1.flag.id(), miningBuilding1.flag.id())
			.mount(scene1);

		new Transporter(base.id(), base.flag.id(), factoryBuilding1.flag.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		new Transporter(base.id(), base.flag.id(), factoryBuilding2.flag.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		new Transporter(base.id(), base.flag.id(), miningBuilding2.flag.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		new Transporter(base.id(), factoryBuilding1.flag.id(), miningBuilding1.flag.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		base.resourcePool[ResourceType.energy] = 10;
	}

	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph () {
		// Since all our objects in addGraph() were mounted to the
		// 'scene1' entity, destroying it will remove everything we
		// added to it.
		(ige.$("scene1") as IgeScene2d).destroy();
	}
}
