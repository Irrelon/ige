var Seat = IgeEventingClass.extend({
	classId: 'Seat',
	
	init: function () {
		this._playerId = '';
	},
	
	seatPlayer: function (player, callback) {
		if (!this._playerId) {
			// Assign the player to the seat
			this._playerId = player.id();
			
			callback(false);
		} else {
			callback('Seat already occupied.');
		}
	},
	
	unSeatPlayer: function (player) {
		if (this._playerId) {
			// Remove player from the seat
			this._playerId = '';
			
			callback(false);
		} else {
			callback('Seat not occupied.');
		}
	}
});