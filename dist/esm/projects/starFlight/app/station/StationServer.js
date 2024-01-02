import { PlayerShip } from "../component/PlayerShip.js"
import { IgeInterval } from "../../../../engine/core/IgeInterval.js"
import { Ore } from "../component/Ore.js"
import { Asteroid } from "../component/Asteroid.js"
import { distance } from "../../../../engine/utils.js"
import { ige } from "../../../../engine/instance.js"
export class StationServer {
    constructor() {
        this._systemId = 'valeria1';
        const network = ige.network;
        // Listen for network connection events
        network.on('connect', self._onPlayerConnect.bind(self)); // Defined in ./gameClasses/ServerNetworkEvents.js
        network.on('disconnect', self._onPlayerDisconnect.bind(self)); // Defined in ./gameClasses/ServerNetworkEvents.js
        // Create some network commands we will need
        network.define('playerEntity', self._onPlayerEntity.bind(self));
        network.define('miningStart', self._onMiningRequest);
        network.define('playerShipControlChange');
        // Start the network server
        await network.start(2000);
        // Add the network stream component
        network.sendInterval(30); // Send a stream update once every 30 milliseconds
        // Accept incoming network connections
        network.acceptConnections(true);
    }
    /**
     * Is called when the network tells us a new client has connected
     * to the server. This is the point we can return true to reject
     * the client connection if we wanted to.
     * @param socket The client socket object.
     * @private
     */
    _onPlayerConnect = function (socket) {
        // Don't reject the client connection
        return false;
    };
    /**
     * Called when a client disconnects.
     * @param {String} clientId The client network id.
     * @private
     */
    _onPlayerDisconnect = function (clientId) {
        if (ige.app.players[clientId]) {
            // Remove the player from the game
            ige.app.players[clientId].destroy();
            // Remove the reference to the player entity
            // so that we don't leak memory
            delete ige.app.players[clientId];
        }
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
    _onPlayerEntity = function (data, clientId) {
        let player;
        player = ige.app.playerByClientId(clientId);
        if (!player) {
            // Create a new player instance
            player = new PlayerShip(clientId)
                .streamMode(1)
                .mount(ige.app.scene.frontScene);
            // Set the player against the client id
            ige.app.playerByClientId(clientId, player);
            // Tell the client to track their player entity by it's id
            ige.network.send('playerEntity', player.id(), clientId);
        }
    };
    _onMiningRequest = function (data, clientId, callback) {
        let player = ige.app.playerByClientId(clientId), asteroid, laser;
        if (data && data.asteroidId) {
            asteroid = ige.engine.$(data.asteroidId);
            if (asteroid) {
                // Check the player's ship has a mining capability
                if (player.ordinance(['mining'])) {
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
                            laser = new Laser()
                                .streamMode(1)
                                .mount(ige.engine.$('frontScene'));
                            player.effects.push(laser);
                        }
                        // Start mining
                        laser.streamProperty('from', player.id());
                        laser.streamProperty('to', asteroid.id());
                        // Start an ore production timer
                        // this should probably be a finite state machine or
                        // something!
                        player.miningInterval = new IgeInterval(function () {
                            const ore = new Ore();
                            ore.mount(ige.app.frontScene);
                            ore.translateTo(asteroid._translate.x, asteroid._translate.y, 0);
                            ore.updateTransform();
                            ore.streamMode(1);
                        }, 2000);
                        // Tell the client there was no error
                        callback();
                    }
                    else {
                        // Tell the client that the asteroid is empty!
                        callback('EMPTY');
                    }
                }
            }
        }
    };
    generateAsteroidBelt = function (beltX, beltY) {
        let maxDist = 900, minDist = 500, dist, x, y, i, count = 0, max = 100, asteroid, asteroidArr = [], rejectedLocation;
        while (count < max) {
            if (!asteroid) {
                asteroid = new Asteroid();
                asteroid.mount(ige.app.scene.frontScene);
            }
            x = Math.floor(beltX + ((Math.random() * maxDist * 2) - maxDist));
            y = Math.floor(beltY + ((Math.random() * maxDist * 2) - maxDist));
            dist = distance(x, y, beltX, beltY);
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
}
