import type {Mixin} from "../../types/Mixin";
import type IgeBaseClass from "../core/IgeBaseClass";

const WithExampleMixin = <T extends Mixin<IgeBaseClass>>(Base: T) => class extends Base {

}

export default WithExampleMixin;
