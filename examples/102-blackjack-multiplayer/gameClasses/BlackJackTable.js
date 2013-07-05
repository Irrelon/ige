var BlackJackTable = IgeEventingClass.extend({
	classId: 'BlackJackTable',
	
	init: function (id, mode, callback) {
		this._seat = [];
		this._seat[0] = new Seat();
		this._seat[1] = new Seat();
		this._seat[2] = new Seat();
		this._seat[3] = new Seat();
		this._seat[4] = new Seat();
		
		if (id) { this.id(id); }
		this.mode(mode);
		
		// Holds a list of players that updates to this table should be sent to
		this._spectators = [];
		
		callback(false, this);
	},
	
	id: function (val) {
		if (val !== undefined) {
			this._id = val;
			return this;
		}
		
		return this._id;
	},
	
	mode: function (val) {
		if (val !== undefined) {
			this._mode = val;
			return this;
		}
		
		return this._mode;
	},
	
	addSpectator: function (player, callback) {
		if (!player) {
			callback('No player passed.', {errCode: 1});
		}
	},
	
	seatPlayer: function (player, seatIndex, callback) {
		if (!player) {
			callback('No player passed.', {errCode: 1});
		}
		
		if (seatIndex === undefined) {
			// Get the next free seat
			seatIndex = this._getFreeSeatIndex();
			if (seatIndex === -1) {
				callback('No seats available.', {errCode: 2})
			}
		}
		
		// Check that the seat index is for a free seat
		if (this._seat[seatIndex]) {
			// Seat is not free
			callback('Seat is not free', {errCode: 3});
		}
		
		// Assign the player to the seat
		this._seat[seatIndex].seatPlayer(player, function (err, data) {
			if (!err) {
				callback(false, data);
			} else {
				callback('Could not seat player at table.', {errCode: 4, errChain: [err, data]});
			}
		});
	},
	
	_getFreeSeatIndex: function () {
		var i;
		
		for (i = 0; i < 5; i++) {
			if (!this._seat[i].isOccupied()) {
				return i;
			}
		}
		
		return -1;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = BlackJackTable; }