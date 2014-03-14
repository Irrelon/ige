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

		// per default entities join a stream room "ige". Since we're using IgeEntity's "setStreamRooms"
        // this room "ige" is left again immediately.
    },
	
    /**
     * Called every frame by the engine when this entity is mounted to the
     * scenegraph. Checks the level rooms of the entity in a predefined interval.
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

    /**
     * Have an entity use the same streamRooms from this component.
     * Mounted entities with inherited streamRooms have the same stream rooms as well - no need to
     * explicitely attach them.
     * @param entity
     */
	attachEntity: function(entity) {
		this._attachedEntities.push(entity);
	},

    /**
     * Checks the level rooms. Called regularly by an interval. Adds the new rooms to the client and the entity,
     * and leaves rooms out of range for the client and the entity.
     * Also does this for
     * @private
     */
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

    /**
     * Leaves all rooms which the unit is not in anymore
     * @param roomPosX new position X
     * @param roomPosY new position Y
     * @param clientId The network client id / socket id
     * @private
     */
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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeLevelRoomComponent; }
