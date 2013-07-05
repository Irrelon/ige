var Seat = IgeEventingClass.extend({
	classId: 'Seat',
	
	init: function () {
	},
	
	seatPlayer: function (player, callback) {
		if (!this.isOccupied()) {
			// Assign the player to the seat
			this._player = player;
			
			callback(false);
		} else {
			callback('Seat already occupied.', {errCode: 1});
		}
	},
	
	unSeatPlayer: function (player) {
		if (this.isOccupied()) {
			// Remove player from the seat
			delete this._player;
			
			callback(false);
		} else {
			callback('Seat not occupied.', {errCode: 1});
		}
	},
	
	isOccupied: function () {
		return !!this._player;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Seat; }