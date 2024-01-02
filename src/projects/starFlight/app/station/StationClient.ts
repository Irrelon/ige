import { ige } from "@/engine/instance";
import { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";

const appCore = require("../../../ige");

appCore.module("StationClient", function ($ige, $game, IgeStreamComponent) {
	const StationClient = function () {
		// Show the connecting dialog
		document.getElementById("connectingDialog").style.display = "block";

		const network = ige.network as IgeNetIoClientController;

		// Hook network events we want to respond to
		network.define("playerEntity", this._onPlayerEntity.bind(self));

		// Start the network client
		network.start("http://localhost:2000");

		// Setup the network stream handler
		network.renderLatency(80); // Render the simulation 80 milliseconds in the past

		// Ask the server to create an entity for us
		network.send("playerEntity");
	};

	/**
	 * Called when the client receives a message from the server that it has
	 * created an entity for our player, sending us the entity id so we can
	 * keep track of our own player entity.
	 * @param {String} entityId The id of our player entity.
	 * @private
	 */
	StationClient.prototype._onPlayerEntity = function (entityId) {
		let self = this,
			eventListener,
			ent = ige.engine.$(entityId);

		if (ent) {
			self._trackPlayerEntity(ent);
			return;
		}

		// The client has not yet received the entity via the network
		// stream so lets ask the stream to tell us when it creates a
		// new entity and then check if that entity is the one we
		// should be tracking!
		eventListener = ige.network.stream.on("entityCreated", function (entity) {
			if (entity.id() === entityId) {
				self._trackPlayerEntity(ige.engine.$(entityId));

				// Turn off the listener for this event now that we
				// have found and started tracking our player entity
				ige.network.stream.off("entityCreated", eventListener, function (result) {
					if (!result) {
						this.log("Could not disable event listener!", "warning");
					}
				});
			}
		});
	};

	/**
	 * Sets up camera tracking for our player entity.
	 * @param {IgeEntity} ent Our player entity to track.
	 * @private
	 */
	StationClient.prototype._trackPlayerEntity = function (ent) {
		// Store the player entity reference
		ige.app.playerEntity = ent;

		// Tell the camera to track this entity with some elasticity
		ige.$("vp1").camera.trackTranslate(ent, 8);

		// Hide connection dialog now that the player can do something
		document.getElementById("connectingDialog").style.display = "none";
	};

	return StationClient;
});
