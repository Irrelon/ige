import { ige } from "@/engine/instance";
import { isServer } from "@/engine/clientServer";
import { systems } from "../data/systems";
import { playerData } from "../data/playerData";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { SpaceStation } from "../component/SpaceStation";
import { JumpGate } from "../component/JumpGate";
import { GameEntity } from "../component/GameEntity";
import { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import { IgeNetworkServerSideMessageHandler, IgeNetworkServerSideRequestHandler } from "@/types/IgeNetworkMessage";
import { PlayerShip } from "../component/PlayerShip";
import { MiningLaserEffect } from "../component/effects/MiningLaserEffect";
import { IgeInterval } from "@/engine/core/IgeInterval";
import { IgeNetIoSocket } from "@/engine/network/server/IgeNetIoSocket";
import { generateAsteroidBelt } from "../../services/asteroidBelt";
import { EntityModuleDefinition } from "../../types/EntityModuleDefinition";
import { EntityAbilityModuleDefinition } from "../../types/EntityAbilityModuleDefinition";
import { modules } from "../data/modules";
import { generateModuleObject } from "../../services/gameUtils";

export interface ServerPublicGameData {
	modules: Record<string, EntityModuleDefinition | EntityAbilityModuleDefinition>
}

export class SpaceServerScene extends IgeSceneGraph {
	classId = "SpaceServerScene";
	publicGameData: ServerPublicGameData;
	players: Record<string, GameEntity>;

	constructor () {
		super();

		// Set up the game storage for the server-side
		// This is the players object that stores player state per network
		// connection client id
		this.players = {};

		this.publicGameData = {
			modules
		}

		const network = ige.network as IgeNetIoServerController;

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

	addGraph () {
		if (!isServer) {
			return;
		}

		const mainScene = ige.$("mainScene") as IgeScene2d;

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

		const systemData = systems["valeria"];

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

	removeGraph () {
		const sceneBase = ige.$("sceneBase");
		if (!sceneBase) return;

		sceneBase.destroy();
	}

	playerByClientId (clientId: string, player?: GameEntity) {
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
		if (!this.players[clientId]) {
			return;
		}

		this.players[clientId].destroy();
		delete this.players[clientId];
	}

	_onPublicGameData: IgeNetworkServerSideRequestHandler = (data, clientId, callback) => {
		if (!callback) return;
		callback(this.publicGameData);
	};

	/**
	 * Is called when a network packet with the "playerEntity" command
	 * is received by the server. This is the client asking for a player entity.
	 * @param {Object} data The data object that contains any data sent from the client.
	 * @param {String} clientId The id of the client that sent the command.
	 * @private
	 */
	_onPlayerEntity: IgeNetworkServerSideMessageHandler = (data, clientId) => {
		if (this.playerByClientId(clientId)) {
			return;
		}

		const playerDataModules = playerData.modules;

		const player = new PlayerShip({
			clientId,
			module: generateModuleObject(playerDataModules)
		}).streamMode(1).mount(ige.$("frontScene") as IgeScene2d);

		player._inventory.on("change", () => {
			player._publicGameData.state.inventoryCount.val = player._inventory.count();
		});

		player._inventory.post(playerData.inventory);

		this.playerByClientId(clientId, player);
		(ige.network as IgeNetIoServerController).send("playerEntity", player.id(), clientId);
	};

	_onMiningStartRequest: IgeNetworkServerSideRequestHandler = (data, clientId: string, callback) => {
		const player = this.playerByClientId(clientId);

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
						callback();
					} else {
						// Tell the client that the asteroid is empty!
						callback("EMPTY");
					}
				}
			}
		}
	};

	_onAbilityUseRequest: IgeNetworkServerSideMessageHandler = (data, clientId, callback) => {
		if (!data || data && !data.abilityId) {
			return callback && callback("noAbilityId");
		}

		const playerEntity = this.playerByClientId(clientId);

		if (!playerEntity) {
			return callback && callback("noPlayer");
		}

		playerEntity._onAbilityUseRequest(data, clientId, callback);
	};

	_onPlayerControlChange: IgeNetworkServerSideMessageHandler = (data, clientId: string) => {
		const playerEntity = this.playerByClientId(clientId) as PlayerShip;
		if (!playerEntity) {
			console.error("Control change received for player but no player entity found!");
			return;
		}

		playerEntity._controlState[data[0]] = data[1];
	};
}
