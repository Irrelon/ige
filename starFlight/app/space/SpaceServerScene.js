import { ige } from "../../../engine/instance.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { isServer } from "../../../engine/clientServer.js";
let appCore = require("../../../ige"), galaxyData;
require("../component/JumpGate");
require("../component/Asteroid");
galaxyData = require("../data/galaxy.json");
export const generateAsteroidBelt = function generateAsteroidBelt(beltX, beltY) {
    let maxDist = 900, minDist = 500, dist, x, y, i, count = 0, max = 100, asteroid, asteroidArr = [], rejectedLocation;
    while (count < max) {
        if (!asteroid) {
            asteroid = new Asteroid();
            asteroid.mount(ige.game.scene.middleScene);
        }
        x = Math.floor(beltX + ((Math.random() * maxDist * 2) - maxDist));
        y = Math.floor(beltY + ((Math.random() * maxDist * 2) - maxDist));
        dist = Math.distance(x, y, beltX, beltY);
        if (dist > minDist && dist < maxDist) {
            asteroid.translateTo(x, y, 0);
            asteroid.updateTransform();
            rejectedLocation = false;
            // Make sure no asteroids intersect this one
            for (i = 0; i < asteroidArr.length; i++) {
                if (asteroidArr[i].aabb().intersects(asteroid.aabb(true))) {
                    // The asteroid intersects another, reject this location
                    rejectedLocation = true;
                    break;
                }
            }
            if (!rejectedLocation) {
                asteroid.streamMode(1);
                asteroidArr.push(asteroid);
                asteroid = undefined;
                count++;
            }
        }
    }
};
export class SpaceServerScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "SpaceServerScene";
    }
    addGraph() {
        let systemData, station, jumpGate, asteroidBelt, i;
        if (isServer) {
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
            // Read the galaxy data for this system
            systemData = require("../data/system/" + moduleSelf.$controller._systemId);
            // Create stations
            if (systemData.station) {
                for (i = 0; i < systemData.station.length; i++) {
                    station = systemData.station[i];
                    new SpaceStation(station.public)
                        .id(station._id)
                        .translateTo(station.position[0], station.position[1], station.position[2])
                        .streamMode(1)
                        .mount(ige.game.scene.middleScene);
                }
            }
            // Create jump gates
            if (systemData.jumpGate) {
                for (i = 0; i < systemData.jumpGate.length; i++) {
                    jumpGate = systemData.jumpGate[i];
                    new JumpGate(jumpGate.public)
                        .id(jumpGate._id)
                        .translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
                        .streamMode(1)
                        .mount(ige.game.scene.middleScene);
                }
            }
            // Create jump gates
            if (systemData.asteroidBelt) {
                for (i = 0; i < systemData.asteroidBelt.length; i++) {
                    asteroidBelt = systemData.asteroidBelt[i];
                    generateAsteroidBelt(asteroidBelt.position[0], asteroidBelt.position[1]);
                }
            }
        }
    }
    removeGraph() {
        let i;
        if (ige.$("sceneBase")) {
            ige.$("sceneBase").destroy();
            // Clear any references
            for (i in ige.game.scene) {
                if (ige.game.scene.hasOwnProperty(i)) {
                    if (!ige.game.scene[i].alive()) {
                        delete ige.game.scene[i];
                    }
                }
            }
        }
    }
}
