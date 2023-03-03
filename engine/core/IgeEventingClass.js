import IgeBaseClass from "./IgeBaseClass.js";
import WithEventingMixin from "../mixins/IgeEventingMixin.js";
/**
 * Creates a new class with the capability to emit events.
 */
class IgeEventingClass extends WithEventingMixin(IgeBaseClass) {
}
export default IgeEventingClass;
