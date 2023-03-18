export const WithDataMixin = (Base) => class extends Base {
    constructor() {
        super(...arguments);
        this._data = {};
    }
    data(key, value) {
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
