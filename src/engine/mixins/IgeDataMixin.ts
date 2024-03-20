import type { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeMixin } from "@/types/IgeMixin";

export const WithDataMixin = <BaseClassType extends IgeMixin<IgeBaseClass>> (Base: BaseClassType) =>
	class extends Base {
		_data: Record<string, any> = {};

		data (key: string, value: any): this;
		data (key: string): any;
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
