export class IgeOptions {
	_options: Record<string, any> = {};

	get (id: string, valDefault: any) {
		return this._options[id] !== undefined ? this._options[id] : valDefault;
	}

	set (id: string, val: any) {
		this._options[id] = val;
		return this;
	}
}
