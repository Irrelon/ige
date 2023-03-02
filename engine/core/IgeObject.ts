import IgeEventingClass from "./IgeEventingClass";
import Ige from "./Ige";

/**
 * Creates a new object.
 */
class IgeObject extends IgeEventingClass {
    classId = "IgeObject";

    constructor(ige: Ige) {
        super(ige);
        this._ige = ige;
    }
}

export default IgeObject;
