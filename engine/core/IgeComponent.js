import IgeBaseClass from "./IgeBaseClass.js";
class IgeComponent extends IgeBaseClass {
    constructor(parent, options) {
        super();
        this.componentId = "IgeComponent";
        this._entity = parent;
        this._options = options;
    }
}
export default IgeComponent;
