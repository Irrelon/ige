/**
 * Created by Jimmy on 2014-02-23.
 */
var ChatComponent = IgeEventingClass.extend({
    classId: 'ChatComponent',
    componentId: 'chat',

    init: function(entity, options) {
        this._entity = entity;
        this._options = options;

        this._whisperRoom = {
            roomId: 'whisper',
            users: [] // array of clientId's
        };

        // CLIENT
        if (!ige.isServer) {
            this.implement(ChatClient);

            // client variables
            this._room = false; // no default room

            // define network commands
            this._entity
                .network.define('onChatJoinRoom', this._onJoinedRoom)
                .network.define('onChatRoomMsg', this._onRoomMessageFromServer)
                .network.define('onChatRoomCreated', this._onRoomCreated)
                .network.define('onChatRoomRemoved', this._onRoomRemoved)
                .network.define('onChatGlobalRoomCreated', this._onGlobalRoomCreated)
                .network.define('onChatGlobalRoomRemoved', this._onGlobalRoomRemoved);
        }

        // SERVER
        if (ige.isServer) {
            this.implement(ChatServer);

            // server variables
            this._rooms = {};
            this._globalRooms = {};

            // define network command listeners
            this._entity
                .network.define('onChatJoinRoom', this._onJoinRoomRequest)
                .network.define('onChatRoomMsg', this._onRoomMessageFromClient)
                .network.define('onChatRoomCreated')
                .network.define('onChatRoomRemoved')
                .network.define('onChatGlobalRoomCreated')
                .network.define('onChatGlobalRoomRemoved');
        }

        console.log('Custom Chat component: Initialized!');
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ChatComponent; }