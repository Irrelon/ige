var Player = IgeEventingClass.extend({
	classId: 'Player',
	
	init: function (playerData) {
		// Holds the player data object
		this._playerData = playerData;
		
		// Holds the array of tables the player is currently at
		this._tables = [];
		
		// Holds the array of seats the player is currently sat at
		this._seats = [];
	},
	
	id: function () {
		return this._id;
	},
	
	joinTable: function (tableId) {
		
	},
	
	leaveTable: function (tableId) {
		
	},
	
	sitDown: function (tableId, seatId) {
		
	},
	
	standUp: function (tableId, seatId) {
		
	}
});