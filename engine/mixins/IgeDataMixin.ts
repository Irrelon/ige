import type {Mixin} from "../../types/Mixin";
import type IgeBaseClass from "../core/IgeBaseClass";

const WithDataMixin = <T extends Mixin<IgeBaseClass>>(Base: T) => class extends Base {
	_data: Record<string, any> = {};

	data(key?: string, value?: any) {
		if (key === undefined) {
			return;
		}

		if (value !== undefined) {
			this._data = this._data || {};
			this._data[key] = value;

			return this;
		}

		if (this._data) {
			return this._data[key];
		}

		return null;
	}
}

export default WithDataMixin;
