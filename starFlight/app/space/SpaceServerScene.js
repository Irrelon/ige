import { ige } from "../../../engine/instance.js";
import { isServer } from "../../../engine/clientServer.js";
import { systems } from "../data/systems.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { SpaceStation } from "../component/SpaceStation.js";
import { JumpGate } from "../component/JumpGate.js";
import { generateAsteroidBelt } from "../../services/asteroidBelt.js";
export class SpaceServerScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "SpaceServerScene";
    }
    addGraph() {
        if (!isServer) {
            return;
        }
        const mainScene = ige.$("mainScene");
        const sceneBase = new IgeScene2d()
            .id("sceneBase")
            .mount(mainScene);
        const backScene = new IgeScene2d()
            .id("backScene")
            .layer(0)
            .mount(sceneBase);
        const middleScene = new IgeScene2d()
            .id("middleScene")
            .layer(1)
            .mount(sceneBase);
        new IgeScene2d()
            .id("frontScene")
            .layer(2)
            .mount(sceneBase);
        const systemData = systems[ige.game._systemId];
        if (systemData.station) {
            for (let i = 0; i < systemData.station.length; i++) {
                const station = systemData.station[i];
                new SpaceStation(station.public)
                    .id(station._id)
                    .translateTo(station.position[0], station.position[1], station.position[2])
                    .streamMode(1)
                    .mount(middleScene);
            }
        }
        if (systemData.jumpGate) {
            for (let i = 0; i < systemData.jumpGate.length; i++) {
                const jumpGate = systemData.jumpGate[i];
                new JumpGate(jumpGate.public)
                    .id(jumpGate._id)
                    .translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
                    .streamMode(1)
                    .mount(middleScene);
            }
        }
        if (systemData.asteroidBelt) {
            for (let i = 0; i < systemData.asteroidBelt.length; i++) {
                const asteroidBelt = systemData.asteroidBelt[i];
                generateAsteroidBelt(asteroidBelt.position[0], asteroidBelt.position[1]);
            }
        }
    }
    removeGraph() {
        const sceneBase = ige.$("sceneBase");
        if (!sceneBase)
            return;
        sceneBase.destroy();
    }
}
