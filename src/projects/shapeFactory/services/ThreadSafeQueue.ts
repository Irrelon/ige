import { arrPull } from "@/engine/utils";

export class ThreadSafeQueue<DataType> {
	_queue: DataType[] = [];
	_add: DataType[] = [];
	_remove: DataType[] = [];

	addItem(item: DataType) {
		this._add.push(item);
	}

	removeItem(item: DataType) {
		this._remove.push(item);
	}

	getIndex(index: number): DataType {
		return this._queue[index];
	}

	length() {
		return this._queue.length;
	}

	update() {
		// Process removals
		this._remove.forEach((item) => {
			arrPull(this._queue, item);
		});

		// Process additions
		this._add.forEach((item) => {
			this._queue.push(item);
		});

		this._add = [];
		this._remove = [];
	}
}
