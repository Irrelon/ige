import { IgeEventingClass } from "./IgeEventingClass.js"
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
