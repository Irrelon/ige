"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceServerScene = void 0;
const instance_1 = require("../../../../engine/instance.js");
const clientServer_1 = require("../../../../engine/clientServer.js");
const systems_1 = require("../data/systems");
const playerData_1 = require("../data/playerData");
const IgeScene2d_1 = require("../../../../engine/core/IgeScene2d.js");
const IgeSceneGraph_1 = require("../../../../engine/core/IgeSceneGraph.js");
const SpaceStation_1 = require("../component/SpaceStation");
const JumpGate_1 = require("../component/JumpGate");
const PlayerShip_1 = require("../component/PlayerShip");
const MiningLaserEffect_1 = require("../component/effects/MiningLaserEffect");
const IgeInterval_1 = require("../../../../engine/core/IgeInterval.js");
const asteroidBelt_1 = require("../../services/asteroidBelt");
const modules_1 = require("../data/modules");
const gameUtils_1 = require("../../services/gameUtils");
class SpaceServerScene extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super();
        this.classId = "SpaceServerScene";
        this._onPublicGameData = (data, clientId, callback) => {
            if (!callback)
                return;
            callback(this.publicGameData);
        };
        /**
         * Is called when a network packet with the "playerEntity" command
         * is received by the server. This is the client asking for a player entity.
         * @param {Object} data The data object that contains any data sent from the client.
         * @param {String} clientId The id of the client that sent the command.
         * @private
         */
        this._onPlayerEntity = (data, clientId) => {
            if (this.playerByClientId(clientId)) {
                return;
            }
            const playerDataModules = playerData_1.playerData.modules;
            const player = new PlayerShip_1.PlayerShip({
                clientId,
                module: (0, gameUtils_1.generateModuleObject)(playerDataModules)
            }).streamMode(1).mount(instance_1.ige.$("frontScene"));
            player._inventory.on("change", () => {
                player._publicGameData.state.inventoryCount.val = player._inventory.count();
            });
            player._inventory.post(playerData_1.playerData.inventory);
            this.playerByClientId(clientId, player);
            instance_1.ige.network.send("playerEntity", player.id(), clientId);
        };
        this._onMiningStartRequest = (data, clientId, callback) => {
            const player = this.playerByClientId(clientId);
            if (data && data.asteroidId) {
                const asteroid = instance_1.ige.$(data.asteroidId);
                if (asteroid) {
                    // Check the player's ship has a mining capability
                    if (player.ordinance(["mining"])) {
                        // The ship has mining capability
                        // Check the player's ship has cargo space available
                        // does that matter if mining and then allowing someone
                        // else to tractor the ore?
                        // Check that the asteroid has ore left in it
                        if (asteroid._oreCount > 0) {
                            let laser;
                            player.effects = player.effects || [];
                            // Check if the player already has mining laser effect
                            if (player.effects[0]) {
                                laser = player.effects[0];
                                clearInterval(player.miningInterval);
                            }
                            else {
                                // Create a laser effect
                                laser = new MiningLaserEffect_1.MiningLaserEffect()
                                    .streamMode(1)
                                    .mount(instance_1.ige.$("frontScene"));
                                player.effects.push(laser);
                            }
                            // Start mining
                            laser.streamProperty("from", player.id());
                            laser.streamProperty("to", asteroid.id());
                            // Start an ore production timer
                            // this should probably be a finite state machine or
                            // something!
                            player.miningInterval = new IgeInterval_1.IgeInterval(function () {
                                asteroid.spawnMinedOre(asteroid, clientId);
                            }, 10000);
                            // Tell the client there was no error
                            callback();
                        }
                        else {
                            // Tell the client that the asteroid is empty!
                            callback("EMPTY");
                        }
                    }
                }
            }
        };
        this._onAbilityUseRequest = (data, clientId, callback) => {
            if (!data || data && !data.abilityId) {
                return callback && callback("noAbilityId");
            }
            const playerEntity = this.playerByClientId(clientId);
            if (!playerEntity) {
                return callback && callback("noPlayer");
            }
            playerEntity._onAbilityUseRequest(data, clientId, callback);
        };
        this._onPlayerControlChange = (data, clientId) => {
            const playerEntity = this.playerByClientId(clientId);
            if (!playerEntity) {
                console.error("Control change received for player but no player entity found!");
                return;
            }
            playerEntity._controlState[data[0]] = data[1];
        };
        // Set up the game storage for the server-side
        // This is the players object that stores player state per network
        // connection client id
        this.players = {};
        this.publicGameData = {
            modules: modules_1.modules
        };
        const network = instance_1.ige.network;
        // Listen for network connection events
        network.on("connect", this._onPlayerConnect.bind(this));
        network.on("disconnect", this._onPlayerDisconnect.bind(this));
        // Create some network commands we will need
        network.define("publicGameData", this._onPublicGameData);
        network.define("playerEntity", this._onPlayerEntity);
        network.define("miningStart", this._onMiningStartRequest);
        network.define("playerShipControlChange", this._onPlayerControlChange);
        network.define("useAbility", this._onAbilityUseRequest);
        network.define("msg");
        for (let i = 1; i <= 10; i++) {
            network.define("ability_" + i + ".active");
        }
        // Add the network stream component
        network.sendInterval(30); // Send a stream update once every 30 milliseconds
        // Start the network server
        network.start(2000);
        // Accept incoming network connections
        network.acceptConnections(true);
    }
    addGraph() {
        if (!clientServer_1.isServer) {
            return;
        }
        const mainScene = instance_1.ige.$("mainScene");
        const sceneBase = new IgeScene2d_1.IgeScene2d()
            .id("sceneBase")
            .mount(mainScene);
        const backScene = new IgeScene2d_1.IgeScene2d()
            .id("backScene")
            .layer(0)
            .mount(sceneBase);
        const middleScene = new IgeScene2d_1.IgeScene2d()
            .id("middleScene")
            .layer(1)
            .mount(sceneBase);
        new IgeScene2d_1.IgeScene2d()
            .id("frontScene")
            .layer(2)
            .mount(sceneBase);
        const systemData = systems_1.systems["valeria"];
        if (systemData.station) {
            for (let i = 0; i < systemData.station.length; i++) {
                const station = systemData.station[i];
                new SpaceStation_1.SpaceStation(station.public)
                    .id(station._id)
                    .translateTo(station.position[0], station.position[1], station.position[2])
                    .streamMode(1)
                    .mount(middleScene);
            }
        }
        if (systemData.jumpGate) {
            for (let i = 0; i < systemData.jumpGate.length; i++) {
                const jumpGate = systemData.jumpGate[i];
                new JumpGate_1.JumpGate(jumpGate.public)
                    .id(jumpGate._id)
                    .translateTo(jumpGate.position[0], jumpGate.position[1], jumpGate.position[2])
                    .streamMode(1)
                    .mount(middleScene);
            }
        }
        if (systemData.asteroidBelt) {
            for (let i = 0; i < systemData.asteroidBelt.length; i++) {
                const asteroidBelt = systemData.asteroidBelt[i];
                (0, asteroidBelt_1.generateAsteroidBelt)(asteroidBelt.position[0], asteroidBelt.position[1]);
            }
        }
    }
    removeGraph() {
        const sceneBase = instance_1.ige.$("sceneBase");
        if (!sceneBase)
            return;
        sceneBase.destroy();
    }
    playerByClientId(clientId, player) {
        if (player !== undefined) {
            this.players[clientId] = player;
            return this;
        }
        return this.players[clientId];
    }
    /**
     * Is called when the network tells us a new client has connected
     * to the server. This is the point we can return true to reject
     * the client connection if we wanted to.
     * @param socket The client socket object.
     * @private
     */
    _onPlayerConnect(socket) {
        // Don't reject the client connection
        return false;
    }
    /**
     * Called when a client disconnects.
     * @param {String} clientId The client network id.
     * @private
     */
    _onPlayerDisconnect(clientId) {
        if (!this.players[clientId]) {
            return;
        }
        this.players[clientId].destroy();
        delete this.players[clientId];
    }
}
exports.SpaceServerScene = SpaceServerScene;
