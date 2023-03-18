import { IgeBaseClass } from "./IgeBaseClass";
import { WithEventingMixin } from "../mixins/IgeEventingMixin";

/**
 * Creates a new class with the capability to emit events.
 */
export class IgeEventingClass extends WithEventingMixin(IgeBaseClass) {

}
