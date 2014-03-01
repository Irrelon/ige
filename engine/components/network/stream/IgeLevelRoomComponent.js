/**
 * Class you can use together with streaming. Attach to an entity to stream to the room it
 * is in and the 8 rooms around. Also, just receive streams from these rooms.
 * Having a large player base this can save you tons of traffic.
 */
var IgeLevelRoomComponent = IgeClass.extend({
    classId: 'IgeLevelRoomComponent',
	componentId: 'levelRoom',
	
    /**
     * IgeLevelRoomComponent constructor, a normal component constructor
     * @param player The player object where translate data is taken from to assign room levels
     * @param options Options you can set: {networkLevelRoomCheckInterval, networkLevelRoomSize, clientId}
     */
    init: function (player, options) {
		this._options = options;
		//check every 500 miliseconds whether the player is in a new room
		if (!this._options.networkLevelRoomCheckInterval) this._options.networkLevelRoomCheckInterval = 500;
		//how large, in translate sizes, is such a stream room? Remember: The player is in the center room but also sees 8 rooms around him
		if (!this._options.networkLevelRoomSize) this._options.networkLevelRoomSize = 20;
		//if no clientId is set, assume the player's id is also the network client id (as it's often done in ige contexts)
		
		this._player = player;
		this._tickTimer = this._options.networkLevelRoomCheckInterval;
		this._attachedEntities = [];
		this.clientRoomPosition = {
			x: undefined,
			y: undefined
		};
        player.addBehaviour('levelRoom', this._behaviour);
        this._clientLevelRoomChangedCheck();
		//per default we join a stream room "ige" which we'll keep. We will not stream this
		//unit to "ige" though, "ige" will only be used for global streams.
    },
	
    /**
     * Called every frame by the engine when this entity is mounted to the
     * scenegraph.
     * @param ctx The canvas context to render to.
     */
    _behaviour: function (ctx) {
		this.levelRoom._tickTimer += ige._tickDelta;
		//check for a level change every x miliseconds
		if (this.levelRoom._tickTimer / this.levelRoom._options.networkLevelRoomCheckInterval > 1) {
			this.levelRoom._tickTimer -= this.levelRoom._options.networkLevelRoomCheckInterval;
			this.levelRoom._clientLevelRoomChangedCheck();
		}
    },
	
	attachEntity: function(entity) {
		this._attachedEntities.push(entity);
	},
	
	_clientLevelRoomChangedCheck: function() {
		var roomPosX = Math.floor(this._player._translate.x / this._options.networkLevelRoomSize),
			roomPosY = Math.floor(this._player._translate.z / this._options.networkLevelRoomSize);
		if (roomPosX != this.clientRoomPosition.x || roomPosY != this.clientRoomPosition.y) {
			var clientId = this._options.clientId || this._player._id,
				streamRooms = [];
			
			for (var x = roomPosX - 1; x <= roomPosX + 1; x++) {
				for (var y = roomPosY - 1; y <= roomPosY + 1; y++) {
					//set the stream rooms for the actual socket, which is always in sync with the player's stream rooms
                    ige.network.clientJoinRoom(clientId, x + ':' + y);
					streamRooms.push(x + ':' + y);
				}
			}

			//set the stream rooms for the player and all entities
			this._player.setStreamRooms(streamRooms);
			for (e in this._attachedEntities) {
				this._attachedEntities[e].setStreamRooms(streamRooms);
			}


            if (this.clientRoomPosition.x != undefined && this.clientRoomPosition.y != undefined) this._leaveAbandonedLevelRooms(roomPosX, roomPosY, clientId);
			
			//save the new level room position
			this.clientRoomPosition.x = roomPosX;
			this.clientRoomPosition.y = roomPosY;
		}
	},
	
	_leaveAbandonedLevelRooms: function(roomPosX, roomPosY, clientId) {
        var roomsAbandoned = [];
		for (var x = this.clientRoomPosition.x - 1; x <= this.clientRoomPosition.x + 1; x++) {
			for (var y = this.clientRoomPosition.y - 1; y <= this.clientRoomPosition.y + 1; y++) {
				if (x >= roomPosX - 1 && x <= roomPosX + 1 && y >= roomPosY - 1 && y <= roomPosY + 1) continue;
                //add a stream entry saying that the entity left room XY
                //flush the stream immediately
				//set the stream rooms for the actual socket, which is always in sync with the player's stream rooms
				ige.network.clientLeaveRoom(clientId, x + ':' + y);
                roomsAbandoned.push(x + ':' + y);
			}
		}

		/*
		
        //send a stream destroy command to all clients which listen to one of the rooms abandoned but listen to none
        //of the new rooms
        var clientArr = {};
        //first, gather all clients of abandoned rooms
        for (r in roomsAbandoned) {
            var cArr = ige.network.clients(roomsAbandoned[r]);
            if (cArr != undefined) {
                for (c in cArr) {
                    if (c != undefined && !clientArr.hasOwnProperty(c)) clientArr[c] = cArr[c];
                }
            }
        }
        //then check whether they listen to one of the new rooms
        var newRooms = [
            (roomPosX - 1) + ':' + (roomPosY - 1),
            (roomPosX - 1) + ':' + roomPosY,
            (roomPosX - 1) + ':' + (roomPosY + 1),
            roomPosX + ':' + (roomPosY - 1),
            roomPosX + ':' + roomPosY,
            roomPosX + ':' + (roomPosY + 1),
            (roomPosX + 1) + ':' + (roomPosY - 1),
            (roomPosX + 1) + ':' + roomPosY,
            (roomPosX + 1) + ':' + (roomPosY + 1)
        ];
        for (c in clientArr) {
            var cRooms = ige.network.clientRooms(c);
            var sendDestroy = true;
            for (cR in cRooms) {
                if (newRooms.indexOf(cRooms[cR]) != -1) {
                    sendDestroy = false;
                    break;
                }
            }

            if (sendDestroy) {
                this._player.streamDestroy(c);
            }
        }
		
		*/
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeLevelRoomComponent; }
