var BlackJackTable = IgeEventingClass.extend({
	classId: 'BlackJackTable',
	
	init: function (id) {
		this._seat[0] = new Seat();
		this._seat[1] = new Seat();
		this._seat[2] = new Seat();
		this._seat[3] = new Seat();
		this._seat[4] = new Seat();
	}
});