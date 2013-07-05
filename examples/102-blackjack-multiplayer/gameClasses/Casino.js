var Casino = IgeEventingClass.extend({
	classId: 'Casino',
	
	init: function () {
		this._tables = {};
		
		this.createTable('blackjack', '', 1, function (err, data) {
			console.log('create table', err, data);
		});
	},
	
	createTable: function (type, id, mode, callback) {
		var self = this;
		
		if (!id) {
			id = ige.newIdHex();
		}
		
		if (type == 'blackjack') {
			self.log('Creating new blackjack table...');
			new BlackJackTable(id, mode, function (err, data) {
				if (!err) {
					self.log('New blackjack table created');
					callback(false, data);
					self._tables[id] = data;
				} else {
					callback('Could not create new table.', {errCode: 1, errChain: [err, data]});
				}
			});
		}
	},
	
	destroyTable: function (id) {
		var self = this;
		
		self.log('Destroying table ' + id + '...');
		this._tables[id].destroy(function (err, data) {
			if (!err) {
				self.log('Table ' + id + ' destroyed');
				delete self._tables[id];
			} else {
				console.log(err, data);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Casino; }