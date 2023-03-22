import { ige } from "../../../engine/instance.js";
import { IgeEventingClass } from "../../../engine/core/IgeEventingClass.js";
export class SpaceClient extends IgeEventingClass {
    constructor() {
        super();
        // Show the connecting dialog
        const connectingDialog = document.getElementById('connectingDialog');
        if (connectingDialog) {
            connectingDialog.style.display = 'block';
        }
        const network = ige.network;
        // Hook network events we want to respond to
        network.define('playerEntity', this._onPlayerEntity.bind(this));
        // Start the network client
        network.start('http://' + window.location.hostname + ':2000', function () {
            // Set up the network stream handler
            network.renderLatency(80); // Render the simulation 80 milliseconds in the past
            // Ask server for game data
            network.send('publicGameData', null, function (err, data) {
                if (err) {
                    network.stop();
                    console.log("Game error");
                    return;
                }
                ige.game.publicGameData = data;
                // Ask the server to create an entity for us
                network.send('playerEntity');
            });
        });
    }
    /**
     * Called when the client receives a message from the server that it has
     * created an entity for our player, sending us the entity id so we can
     * keep track of our own player entity.
     * @param {String} entityId The id of our player entity.
     * @private
     */
    _onPlayerEntity(entityId) {
        const ent = ige.$(entityId);
        if (ent) {
            this._trackPlayerEntity(ent);
            return;
        }
        const network = ige.network;
        // The client has not yet received the entity via the network
        // stream so lets ask the stream to tell us when it creates a
        // new entity and then check if that entity is the one we
        // should be tracking!
        const eventListener = network.on('entityCreated', (entity) => {
            if (entity.id() === entityId) {
                this._trackPlayerEntity(ige.$(entityId));
                // Turn off the listener for this event now that we
                // have found and started tracking our player entity
                network.off('entityCreated', eventListener, (result) => {
                    if (!result) {
                        this.log('Could not disable event listener!', 'warning');
                    }
                });
            }
        });
    }
    /**
     * Sets up camera tracking for our player entity.
     * @param {IgeEntity} ent Our player entity to track.
     * @private
     */
    _trackPlayerEntity(ent) {
        // Store the player entity reference
        ige.game.playerEntity = ent;
        // Tell the camera to track this entity with some elasticity
        ige.game.scene.vp1.camera.trackTranslate(ent, 8);
        // Hide connection dialog now that the player can do something
        const connectingDialog = document.getElementById('connectingDialog');
        if (connectingDialog) {
            connectingDialog.style.display = 'none';
        }
    }
}
