import type {Mixin} from "../../types/Mixin";
import type IgeBaseClass from "../core/IgeBaseClass";

const WithExampleMixin = <BaseClassType extends Mixin<IgeBaseClass>>(Base: BaseClassType) => class extends Base {

}

export default WithExampleMixin;
