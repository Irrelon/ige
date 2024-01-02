import { IgeEventingClass } from "../../../../engine/core/IgeEventingClass.js";
import { newIdHex } from "../../../../engine/utils.js";

export class Inventory extends IgeEventingClass {
	classId = "Inventory";
	_inventory = [];
	_onChange() {
		this.emit("change");
	}
	post(data) {
		let i;
		if (data instanceof Array) {
			for (i = 0; i < data.length; i++) {
				this.post(data[i]);
			}
			return;
		}
		if (!data._id) {
			// Create random id
			data._id = newIdHex();
		}
		this._inventory.push(data);
		this._onChange();
	}
	get(id) {
		let i;
		if (id) {
			for (i = 0; i < this._inventory.length; i++) {
				if (this._inventory[i]._id === id) {
					return this._inventory[i];
				}
			}
			return;
		}
		return this._inventory;
	}
	put(id, data) {
		let i;
		for (i = 0; i < this._inventory.length; i++) {
			if (this._inventory[i]._id === id) {
				// Found entry index, replace data
				this._inventory[i] = data;
				this._onChange();
				return true;
			}
		}
		return false;
	}
	delete(id) {
		let i;
		for (i = 0; i < this._inventory.length; i++) {
			if (this._inventory[i]._id === id) {
				// Found entry index, delete it
				this._inventory.splice(i, 1);
				this._onChange();
				return true;
			}
		}
		return false;
	}
	count() {
		return this._inventory.length;
	}
}
