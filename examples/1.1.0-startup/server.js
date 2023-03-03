"use strict";
const Server = IgeClass.extend({
    classId: 'Server',
    Server: true,
    init: function (options) {
        // Start the network server
        ige.addComponent(IgeSocketIoComponent);
        ige.components.network.start();
        // Start the game engine
        ige.start(function (success) {
            // Check if the engine started successfully
            if (success) {
                // Accept incoming connections
                ige.components.network.acceptConnections(true);
            }
        });
    }
});
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = Server;
}
