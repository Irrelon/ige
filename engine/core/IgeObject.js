import IgeEventingClass from "./IgeEventingClass.js";
/**
 * Creates a new object.
 */
class IgeObject extends IgeEventingClass {
    constructor(ige) {
        super(ige);
        this.classId = "IgeObject";
        this._ige = ige;
    }
}
export default IgeObject;
