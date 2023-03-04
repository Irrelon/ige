import IgeEventingClass from "./IgeEventingClass.js";
class IgeComponent extends IgeEventingClass {
    constructor(parent, options) {
        super();
        this.componentId = "IgeComponent";
        this._entity = parent;
        this._options = options;
    }
}
export default IgeComponent;
