var appCore = require('../../../ige');

appCore.module('SpaceClient', function ($ige, $game, IgeStreamComponent) {
	var moduleSelf = this;
	
	var SpaceClient = function () {
		var self = this;
		
		// Show the connecting dialog
		document.getElementById('connectingDialog').style.display = 'block';
		
		moduleSelf.on('ready', function () {
			// Hook network events we want to respond to
			$ige.engine.network.define('playerEntity', self._onPlayerEntity.bind(self));
			
			// Start the network client
			$ige.engine.network.start('http://' + window.location.hostname + ':2000', function () {
				// Setup the network stream handler
				$ige.engine.network.addComponent(IgeStreamComponent)
					.stream.renderLatency(80); // Render the simulation 80 milliseconds in the past
				
				// Ask server for game data
				$ige.engine.network.send('publicGameData', null, function (err, data) {
					if (err) {
						$ige.engine.network.stop();
						console.log("Game error");
						return;
					}
					
					$game.publicGameData = data;
					
					// Ask the server to create an entity for us
					$ige.engine.network.send('playerEntity');
				});
			});
		});
	};
	
	/**
	 * Called when the client receives a message from the server that it has
	 * created an entity for our player, sending us the entity id so we can
	 * keep track of our own player entity.
	 * @param {String} entityId The id of our player entity.
	 * @private
	 */
	SpaceClient.prototype._onPlayerEntity = function (entityId) {
		var self = this,
			eventListener,
			ent = $ige.engine.$(entityId);
		
		if (ent) {
			self._trackPlayerEntity(ent);
			return;
		}
		
		// The client has not yet received the entity via the network
		// stream so lets ask the stream to tell us when it creates a
		// new entity and then check if that entity is the one we
		// should be tracking!
		eventListener = $ige.engine.network.stream.on('entityCreated', function (entity) {
			if (entity.id() === entityId) {
				self._trackPlayerEntity($ige.engine.$(entityId));
				
				// Turn off the listener for this event now that we
				// have found and started tracking our player entity
				$ige.engine.network.stream.off('entityCreated', eventListener, function (result) {
					if (!result) {
						this.log('Could not disable event listener!', 'warning');
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
	SpaceClient.prototype._trackPlayerEntity = function (ent) {
		// Store the player entity reference
		$game.playerEntity = ent;
		
		// Tell the camera to track this entity with some elasticity
		$game.scene.vp1.camera.trackTranslate(ent, 8);
		
		// Hide connection dialog now that the player can do something
		document.getElementById('connectingDialog').style.display = 'none';
	};
	
	return SpaceClient;
});