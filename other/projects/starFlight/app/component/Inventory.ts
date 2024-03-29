import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { newIdHex } from "@/engine/utils";

export interface InventoryItem {
	_id?: string;
	type: string;
	meta?: Record<string, any>;
}

export class Inventory extends IgeEventingClass {
	classId = "Inventory";
	_inventory: InventoryItem[] = [];

	_onChange () {
		this.emit("change");
	}

	post (data: InventoryItem | InventoryItem[]) {
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

	get (id: string) {
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

	put (id: string, data: InventoryItem) {
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

	delete (id: string) {
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

	count () {
		return this._inventory.length;
	}
}
