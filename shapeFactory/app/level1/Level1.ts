import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { degreesToRadians } from "@/engine/utils";
import { IgeStreamMode } from "@/enums/IgeStreamMode";
import { ResourceBuilding } from "../../entities/ResourceBuilding";
import { ResourceType } from "../../enums/ResourceType";
import { FactoryBuilding } from "../../entities/FactoryBuilding";
import { Road } from "../../entities/Road";
import { StorageBuilding } from "../../entities/StorageBuilding";
import { IgeAudioEntity } from "@/engine/audio";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { Resource } from "../../entities/Resource";
import { Transporter } from "../../entities/Transporter";

export class Level1 extends IgeSceneGraph {
	classId = "Level1";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph () {
		const baseScene = ige.$("baseScene") as IgeEntity;

		// Clear existing graph data
		if (ige.$("scene1")) {
			this.removeGraph();
		}

		// Create the scene
		const scene1 = new IgeScene2d()
			.id("scene1")
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

		const base = new StorageBuilding()
			.id("base1")
			.translateTo(0, 0, 0)
			.mount(scene1);

		const resourceBuilding1 = new ResourceBuilding(ResourceType.energy)
			.id("resourceBuilding1")
			.translateTo(220, 120, 0)
			.rotateTo(0, 0, degreesToRadians(-10))
			.mount(scene1);

		const factoryBuilding1 = new FactoryBuilding(ResourceType.wood, [{
			resource: ResourceType.energy,
			count: 1
		}])
			.id("factoryBuilding1")
			.translateTo(50, 150, 0)
			.mount(scene1);

		const factoryBuilding2 = new FactoryBuilding(ResourceType.wood, [{
			resource: ResourceType.energy,
			count: 1
		}])
			.id("factoryBuilding2")
			.translateTo(250, -50, 0)
			.mount(scene1);

		new Road(base.id(), resourceBuilding1.id())
			.mount(scene1);

		new Road(base.id(), factoryBuilding2.id())
			.mount(scene1);

		new Road(factoryBuilding2.id(), resourceBuilding1.id())
			.mount(scene1);

		new Road(resourceBuilding1.id(), factoryBuilding1.id())
			.mount(scene1);

		new Transporter(base.id(), factoryBuilding1.id(), resourceBuilding1.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		new Transporter(base.id(), resourceBuilding1.id(), factoryBuilding2.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		new Transporter(base.id(), factoryBuilding2.id(), base.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		new Transporter(base.id(), resourceBuilding1.id(), base.id())
			.translateTo(base._translate.x, base._translate.y, 0)
			.mount(scene1);

		new Resource(ResourceType.wood, factoryBuilding2.id(), factoryBuilding1.id())
			.translateTo(factoryBuilding2._translate.x, factoryBuilding2._translate.y, 0)
			.mount(scene1);
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
