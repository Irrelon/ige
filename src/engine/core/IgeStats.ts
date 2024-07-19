export class IgeStats {
	_data: Record<string, number> = {};
	_start: Record<string, number> = {};

	start (key: string): number {
		return this._start[key] = new Date().getTime();
	}

	end (key: string, add: boolean = false): number {
		const delta = new Date().getTime() - this._start[key];

		if (add) {
			return this._data[key] = this._data[key] += delta;
		}

		return this._data[key] = this._data[key] = delta;
	}
}
