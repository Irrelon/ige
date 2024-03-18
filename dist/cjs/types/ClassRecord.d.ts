import type { AnyInterface } from "./AnyInterface.js"
import type { AnyStringToFunctionInterface } from "./AnyStringToFunctionInterface.js"
export type ClassRecord<ClassType extends AnyInterface<ClassType> = AnyStringToFunctionInterface> = {
    [Key in (keyof Partial<ClassType>)]: Parameters<ClassType[Key]> extends [] ? never : (Parameters<ClassType[Key]>[0] | Parameters<ClassType[Key]>);
};
