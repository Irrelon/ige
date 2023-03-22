import { ige } from "@/engine/instance";
import { isServer } from "@/engine/clientServer";
import { systems } from "../data/systems";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { SpaceStation } from "../component/SpaceStation";
import { JumpGate } from "../component/JumpGate";
import { StarSystemDefinition } from "../../types/StarSystemDefinition";
import { generateAsteroidBelt } from "../../services/asteroidBelt";

export class SpaceServerScene extends IgeSceneGraph {
	classId = "SpaceServerScene";

	addGraph () {
		if (!isServer) {
			return;
		}

		ige.game.scene.sceneBase = new IgeScene2d()
			.id("sceneBase")
			.mount(ige.game.scene.mainScene);

		ige.game.scene.backScene = new IgeScene2d()
			.id("backScene")
			.layer(0)
			.mount(ige.game.scene.sceneBase);

		ige.game.scene.middleScene = new IgeScene2d()
			.id("middleScene")
			.layer(1)
			.mount(ige.game.scene.sceneBase);

		ige.game.scene.frontScene = new IgeScene2d()
			.id("frontScene")
			.layer(2)
			.mount(ige.game.scene.sceneBase);

		const systemData = (systems as Record<string, StarSystemDefinition>)[ige.game._systemId];

		if (systemData.station) {
			for (let i = 0; i < systemData.station.length; i++) {
				const station = systemData.station[i];

				new SpaceStation(station.public)
					.id(station._id)
					.translateTo(station.position[0], station.position[1], station.position[2])
					.streamMode(1)
					.mount(ige.game.scene.middleScene);
			}
		}

		if (systemData.jumpGate) {
			for (let i = 0; i < systemData.jumpGate.length; i++) {
				const jumpGate = systemData.jumpGate[i];

				new JumpGate(jumpGate.public)
					.id(jumpGate._id)
					.translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
					.streamMode(1)
					.mount(ige.game.scene.middleScene);
			}
		}

		if (systemData.asteroidBelt) {
			for (let i = 0; i < systemData.asteroidBelt.length; i++) {
				const asteroidBelt = systemData.asteroidBelt[i];
				generateAsteroidBelt(asteroidBelt.position[0], asteroidBelt.position[1]);
			}
		}
	}

	removeGraph () {
		const sceneBase = ige.$("sceneBase");
		if (!sceneBase) return;

		sceneBase.destroy();
	}
}
