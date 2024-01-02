export class IgeOptions {
	_options = {};
	get(id, valDefault) {
		return this._options[id] !== undefined ? this._options[id] : valDefault;
	}
	set(id, val) {
		this._options[id] = val;
		return this;
	}
}
