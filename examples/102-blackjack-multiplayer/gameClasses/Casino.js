var Casino = IgeEventingClass.extend({
	classId: 'Casino',
	
	init: function () {
		this._tables = [];
	},
	
	newTable: function (type, id) {
		var table;
		
		if (!id) {
			id = ige.newIdHex();
		}
		
		if (type == 'blackjack') {
			table = new BlackJackTable(id);
			this._tables.push(table);
		}
		
		return table;
	}
});