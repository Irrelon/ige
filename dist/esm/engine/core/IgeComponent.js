import { IgeEventingClass } from "./IgeEventingClass";
export class IgeComponent extends IgeEventingClass {
    _entity;
    _options;
    componentId = "IgeComponent";
    constructor(parent, options) {
        super();
        this._entity = parent;
        this._options = options;
    }
    destroy() {
        return this;
    }
}
