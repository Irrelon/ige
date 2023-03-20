var appCore = require('../../../ige'),
	idCounter = 0;

appCore.module('Inventory', function (IgeEventingClass) {
	var Inventory = IgeEventingClass.extend({
		classId: 'Inventory',
		
		init: function () {
			this._inventory = [];
		},
		
		_onChange: function () {
			this.emit('change');
		},
		
		post: function (data) {
			var i;
			
			if (data instanceof Array) {
				for (i = 0; i < data.length; i++) {
					this.post(data[i]);
				}
				return;
			}
			
			if (!data._id) {
				// Create random id
				data._id = this.objectId();
			}
			
			this._inventory.push(data);
			this._onChange();
		},
	
		get: function (id) {
			var i;
			
			if (id) {
				for (i = 0; i < this._inventory.length; i++) {
					if (this._inventory[i]._id === id) {
						return this._inventory[i];
					}
				}
				
				return;
			}
			
			return this._inventory;
		},
	
		put: function (id, data) {
			var i;
			
			for (i = 0; i < this._inventory.length; i++) {
				if (this._inventory[i]._id === id) {
					// Found entry index, replace data
					this._inventory[i] = data;
					this._onChange();
					
					return true;
				}
			}
			
			return false;
		},
	
		delete: function (id) {
			var i;
			
			for (i = 0; i < this._inventory.length; i++) {
				if (this._inventory[i]._id === id) {
					// Found entry index, delete it
					this._inventory.splice(i, 1);
					this._onChange();
					
					return true;
				}
			}
			
			return false;
		},
		
		count: function () {
			return this._inventory.length;
		},
		
		/**
		 * Generates a new 16-character hexadecimal unique ID or
		 * generates a new 16-character hexadecimal ID based on
		 * the passed string. Will always generate the same ID
		 * for the same string.
		 * @param {String=} str A string to generate the ID from.
		 * @return {String}
		 */
		objectId: function (str) {
			var id,
				pow = Math.pow(10, 17);
			
			if (!str) {
				idCounter++;
				
				id = (idCounter + (
					Math.random() * pow +
					Math.random() * pow +
					Math.random() * pow +
					Math.random() * pow
				)).toString(16);
			} else {
				var val = 0,
					count = str.length,
					i;
				
				for (i = 0; i < count; i++) {
					val += str.charCodeAt(i) * pow;
				}
				
				id = val.toString(16);
			}
			
			return id;
		}
	});
	
	return Inventory;
});