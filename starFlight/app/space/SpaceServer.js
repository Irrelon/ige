"use strict";
const appCore = require("../../../ige");
require("../component/PlayerShip");
require("../component/effects/MiningLaserEffect");
appCore.module("SpaceServer", function ($ige, $game, IgeStreamComponent, PlayerShip, MiningLaserEffect, IgeInterval, Ore) {
    const SpaceServer = function () {
        let self = this, i;
        self._systemId = "valeria";
        // Listen for network connection events
        $ige.engine.network.on("connect", self._onPlayerConnect.bind(self)); // Defined in ./gameClasses/ServerNetworkEvents.js
        $ige.engine.network.on("disconnect", self._onPlayerDisconnect.bind(self)); // Defined in ./gameClasses/ServerNetworkEvents.js
        // Create some network commands we will need
        $ige.engine.network.define("publicGameData", self._onpublicGameData.bind(self));
        $ige.engine.network.define("playerEntity", self._onPlayerEntity.bind(self));
        $ige.engine.network.define("miningStart", self._onMiningStartRequest.bind(self));
        $ige.engine.network.define("playerShipControlChange", self._onPlayerControlChange.bind(self));
        $ige.engine.network.define("useAbility", self._onAbilityUseRequest.bind(self));
        $ige.engine.network.define("msg");
        for (i = 1; i <= 10; i++) {
            $ige.engine.network.define("ability_" + i + ".active");
        }
        // Start the network server
        $ige.engine.network.start(2000, function () {
            // Add the network stream component
            $ige.engine.network.addComponent(IgeStreamComponent)
                .stream.sendInterval(30) // Send a stream update once every 30 milliseconds
                .stream.start(); // Start the stream
            // Accept incoming network connections
            $ige.engine.network.acceptConnections(true);
        });
    };
    /**
     * Is called when the network tells us a new client has connected
     * to the server. This is the point we can return true to reject
     * the client connection if we wanted to.
     * @param socket The client socket object.
     * @private
     */
    SpaceServer.prototype._onPlayerConnect = function (socket) {
        // Don't reject the client connection
        return false;
    };
    /**
     * Called when a client disconnects.
     * @param {String} clientId The client network id.
     * @private
     */
    SpaceServer.prototype._onPlayerDisconnect = function (clientId) {
        if ($game.players[clientId]) {
            // Remove the player from the game
            $game.players[clientId].destroy();
            // Remove the reference to the player entity
            // so that we don't leak memory
            delete $game.players[clientId];
        }
    };
    SpaceServer.prototype._onpublicGameData = function (data, clientId, callback) {
        callback(false, $game.publicGameData);
    };
    /**
     * Is called when a network packet with the "playerEntity" command
     * is received by the server or client.
     *
     * @client This is the server telling us which entity is our player entity
     * so that we can track it with the main camera!
     * @server This is the client asking for a player entity.
     * @param {Object} data The data object that contains any data sent from the server.
     * @param {String=} clientId The id of the client that sent the command.
     * @private
     */
    SpaceServer.prototype._onPlayerEntity = function (data, clientId) {
        let player, playerData, modules;
        player = $game.playerByClientId(clientId);
        if (!player) {
            // Create a new player instance
            playerData = require("../data/playerData_dummyData.json");
            modules = playerData.modules;
            player = new PlayerShip({
                clientId: clientId,
                module: $game.generateModuleObject(JSON.parse(JSON.stringify(modules)))
            }).streamMode(1).mount($game.scene.frontScene);
            // Keep inventory count up to date
            player._inventory.on("change", function () {
                player._publicGameData.state.inventoryCount.val = player._inventory.count();
            });
            // Apply player data
            player._inventory.post(playerData.inventory);
            // Set the player against the client id
            $game.playerByClientId(clientId, player);
            // Tell the client to track their player entity by it's id
            $ige.engine.network.send("playerEntity", player.id(), clientId);
        }
    };
    SpaceServer.prototype._onMiningStartRequest = function (data, clientId, callback) {
        let player = $game.playerByClientId(clientId), asteroid, laser;
        if (data && data.asteroidId) {
            asteroid = $ige.engine.$(data.asteroidId);
            if (asteroid) {
                // Check the player's ship has a mining capability
                if (player.ordinance(["mining"])) {
                    // The ship has mining capability
                    // Check the player's ship has cargo space available
                    // does that matter if mining and then allowing someone
                    // else to tractor the ore?
                    // Check that the asteroid has ore left in it
                    if (asteroid._oreCount > 0) {
                        player.effects = player.effects || [];
                        // Check if the player already has mining laser effect
                        if (player.effects[0]) {
                            laser = player.effects[0];
                            clearInterval(player.miningInterval);
                        }
                        else {
                            // Create a laser effect
                            laser = new MiningLaserEffect()
                                .streamMode(1)
                                .mount($ige.engine.$("frontScene"));
                            player.effects.push(laser);
                        }
                        // Start mining
                        laser.streamProperty("from", player.id());
                        laser.streamProperty("to", asteroid.id());
                        // Start an ore production timer
                        // this should probably be a finite state machine or
                        // something!
                        player.miningInterval = new IgeInterval(function () {
                            asteroid.spawnMinedOre(asteroid, clientId);
                        }, 10000);
                        // Tell the client there was no error
                        callback(false);
                    }
                    else {
                        // Tell the client that the asteroid is empty!
                        callback("EMPTY");
                    }
                }
            }
        }
    };
    SpaceServer.prototype._onAbilityUseRequest = function (data, clientId, callback) {
        let playerEntity;
        if (!data || data && !data.abilityId) {
            return callback("noAbilityId");
        }
        playerEntity = $game.playerByClientId(clientId);
        if (!playerEntity) {
            return callback("noPlayer");
        }
        playerEntity._onAbilityUseRequest(data, callback);
    };
    /* CEXCLUDE */
    SpaceServer.prototype._onPlayerControlChange = function (data, clientId) {
        $game.playerByClientId(clientId)._controlState[data[0]] = data[1];
    };
    /* CEXCLUDE */
    return SpaceServer;
});
