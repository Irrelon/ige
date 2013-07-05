var BlackJackTable = IgeEntity.extend({
	classId: 'BlackJackTable',
	
	init: function () {
		IgeEntity.prototype.init.call(this);
		
		this._seat = [];
		this._seat[0] = new Seat();
		this._seat[1] = new Seat();
		this._seat[2] = new Seat();
		this._seat[3] = new Seat();
		this._seat[4] = new Seat();
		
		// Holds a list of players that updates to this table should be sent to
		this._spectators = [];
		
		// Create the table scene
		this._createScene();
		
		// Set the streaming mode to 1 to sync all changes over the network
		this.streamMode(1);
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
	
	startRound: function () {
		new Card(1, 1)
			.mount(ige.$('cardMount0'))
			.streamMode(1);
		
		new Card(2, 2)
			.mount(ige.$('cardMount1'))
			.streamMode(1);
		
		new Card(3, 3)
			.mount(ige.$('cardMount2'))
			.streamMode(1);
		
		new Card(4, 4)
			.mount(ige.$('cardMount3'))
			.streamMode(1);
		
		new Card(1, 5)
			.mount(ige.$('cardMount4'))
			.streamMode(1);
		
		new Card(2, 6)
			.mount(ige.$('cardMount5'))
			.streamMode(1);
	},
	
	_getFreeSeatIndex: function () {
		var i;
		
		for (i = 0; i < 5; i++) {
			if (!this._seat[i].isOccupied()) {
				return i;
			}
		}
		
		return -1;
	},
	
	_createScene: function () {
		var self = this;
		
		// Background image
		new BlackJackBackground()
			.id('bjback')
			.mount(ige.$('backgroundScene'))
			.streamMode(1);
		
		new IgeEntity()
			.id('cardMount0')
			.translateTo(0, -96, 0)
			.rotateTo(0, 0, 0)
			.mount(ige.$('gameScene'))
			.streamMode(1);
		
		new IgeEntity()
			.id('cardMount1')
			.translateTo(480, 152, 0)
			.rotateTo(0, 0, Math.radians(-26))
			.mount(ige.$('gameScene'))
			.streamMode(1);
		
		new IgeEntity()
			.id('cardMount2')
			.translateTo(246, 232, 0)
			.rotateTo(0, 0, Math.radians(-13))
			.mount(ige.$('gameScene'))
			.streamMode(1);
		
		new IgeEntity()
			.id('cardMount3')
			.translateTo(0, 256, 0)
			.rotateTo(0, 0, 0)
			.mount(ige.$('gameScene'))
			.streamMode(1);
		
		new IgeEntity()
			.id('cardMount4')
			.translateTo(-246, 232, 0)
			.rotateTo(0, 0, Math.radians(13))
			.mount(ige.$('gameScene'))
			.streamMode(1);
		
		new IgeEntity()
			.id('cardMount5')
			.translateTo(-480, 152, 0)
			.rotateTo(0, 0, Math.radians(26))
			.mount(ige.$('gameScene'))
			.streamMode(1);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = BlackJackTable; }