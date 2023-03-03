import IgeBaseClass from "./IgeBaseClass";
import WithEventingMixin from "../mixins/IgeEventingMixin";


/**
 * Creates a new class with the capability to emit events.
 */
class IgeEventingClass extends WithEventingMixin(IgeBaseClass) {

}

export default IgeEventingClass;
