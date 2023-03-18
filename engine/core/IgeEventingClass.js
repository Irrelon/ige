import { IgeBaseClass } from "./IgeBaseClass.js";
import { WithEventingMixin } from "../mixins/IgeEventingMixin.js";
/**
 * Creates a new class with the capability to emit events.
 */
export class IgeEventingClass extends WithEventingMixin(IgeBaseClass) {
}
