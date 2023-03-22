import { ige } from "@/engine/instance";
import { playerData } from "../data/playerData";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import { IgeNetIoSocket } from "@/engine/network/server/IgeNetIoSocket";
import { IgeNetworkServerSideMessageHandler, IgeNetworkServerSideRequestHandler } from "@/types/IgeNetworkMessage";
import { IgeInterval } from "@/engine/core/IgeInterval";
import { MiningLaserEffect } from "../component/effects/MiningLaserEffect";
import { PlayerShip } from "../component/PlayerShip";
import type { IgeScene2d } from "@/engine/core/IgeScene2d";

export class SpaceServer extends IgeEventingClass {
	constructor () {
		super();

		ige.game._systemId = "valeria";

		const network = ige.network as IgeNetIoServerController;

		// Listen for network connection events
		network.on("connect", this._onPlayerConnect.bind(this)); // Defined in ./gameClasses/ServerNetworkEvents.js
		network.on("disconnect", this._onPlayerDisconnect.bind(this)); // Defined in ./gameClasses/ServerNetworkEvents.js

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
		network.sendInterval(30) // Send a stream update once every 30 milliseconds

		// Start the network server
		network.start(2000);

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
	_onPlayerConnect (socket: IgeNetIoSocket) {
		// Don't reject the client connection
		return false;
	}

	/**
	 * Called when a client disconnects.
	 * @param {String} clientId The client network id.
	 * @private
	 */
	_onPlayerDisconnect (clientId: string) {
		if (ige.game.players[clientId]) {
			// Remove the player from the game
			ige.game.players[clientId].destroy();

			// Remove the reference to the player entity
			// so that we don't leak memory
			delete ige.game.players[clientId];
		}
	}

	_onPublicGameData: IgeNetworkServerSideRequestHandler = (data, clientId, callback) => {
		if (!callback) return;
		callback(false, ige.game.publicGameData);
	}

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
	_onPlayerEntity: IgeNetworkServerSideMessageHandler = (data, clientId) => {
		if (ige.game.playerByClientId(clientId)) {
			return;
		}

		const modules = playerData.modules;

		const player = new PlayerShip({
			clientId: clientId,
			module: ige.game.generateModuleObject(JSON.parse(JSON.stringify(modules)))
		}).streamMode(1).mount(ige.game.scene.frontScene);

		player._inventory.on("change", function () {
			player._publicGameData.state.inventoryCount.val = player._inventory.count();
		});

		player._inventory.post(playerData.inventory);

		ige.game.playerByClientId(clientId, player);
		(ige.network as IgeNetIoServerController).send("playerEntity", player.id(), clientId);
	}

	_onMiningStartRequest: IgeNetworkServerSideRequestHandler = (data, clientId: string, callback) => {
		const player = ige.game.playerByClientId(clientId);

		if (data && data.asteroidId) {
			const asteroid = ige.$(data.asteroidId);

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
						} else {
							// Create a laser effect
							laser = new MiningLaserEffect()
								.streamMode(1)
								.mount(ige.$("frontScene") as IgeScene2d);

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
					} else {
						// Tell the client that the asteroid is empty!
						callback("EMPTY");
					}
				}
			}
		}
	}

	_onAbilityUseRequest: IgeNetworkServerSideMessageHandler = (data, clientId, callback) => {
		if (!data || data && !data.abilityId) {
			return callback && callback("noAbilityId");
		}

		const playerEntity = ige.game.playerByClientId(clientId);

		if (!playerEntity) {
			return callback && callback("noPlayer");
		}

		playerEntity._onAbilityUseRequest(data, clientId, callback);
	}

	_onPlayerControlChange: IgeNetworkServerSideMessageHandler = (data, clientId: string) => {
		ige.game.playerByClientId(clientId)._controlState[data[0]] = data[1];
	}
}
