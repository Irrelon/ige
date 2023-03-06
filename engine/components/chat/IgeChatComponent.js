import IgeComponent from "../../core/IgeComponent.js";
class IgeChatComponent extends IgeComponent {
    constructor(entity, options) {
        super(entity, options);
        this.classId = 'IgeChatComponent';
        this.componentId = 'chat';
        this._rooms = {};
        /* CEXCLUDE */
        if (isServer) {
            this.implement(IgeChatServer);
            // Define the chat system network commands
            this._entity
                .network.define('igeChatMsg', this._onMessageFromClient)
                .network.define('igeChatJoinRoom', this._onJoinRoomRequestFromClient)
                .network.define('igeChatLeaveRoom', this._onLeaveRoomRequestFromClient)
                .network.define('igeChatRoomList', this._onClientWantsRoomList)
                .network.define('igeChatRoomUserList', this._onClientWantsRoomUserList)
                .network.define('igeChatRoomCreated')
                .network.define('igeChatRoomRemoved');
        }
        /* CEXCLUDE */
        if (isClient) {
            this.implement(IgeChatClient);
            // Define the chat system network command listeners
            this._entity
                .network.define('igeChatMsg', this._onMessageFromServer)
                .network.define('igeChatJoinRoom', this._onJoinedRoom)
                .network.define('igeChatLeaveRoom', this._onLeftRoom)
                .network.define('igeChatRoomList', this._onServerSentRoomList)
                .network.define('igeChatRoomUserList', this._onServerSentRoomUserList)
                .network.define('igeChatRoomCreated', this._onRoomCreated)
                .network.define('igeChatRoomRemoved', this._onRoomRemoved);
        }
        this.log('Chat component initiated!');
    }
}
;
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = IgeChatComponent;
}
