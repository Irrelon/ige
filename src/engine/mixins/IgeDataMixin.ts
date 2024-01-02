import type { IgeBaseClass } from "../core/IgeBaseClass";
import type { Mixin } from "@/types/Mixin";

export const WithDataMixin = <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) =>
	class extends Base {
		_data: Record<string, any> = {};

		data(key: string, value: any): this;
		data(key: string): any;
		data (key: string, value?: any) {
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
	};
