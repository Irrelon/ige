import type { IgeAnyInterface } from "./IgeAnyInterface.js"
import type { IgeAnyStringToFunctionInterface } from "./IgeAnyStringToFunctionInterface.js"
export type IgeClassRecord<ClassType extends IgeAnyInterface<ClassType> = IgeAnyStringToFunctionInterface> = {
    [Key in (keyof Partial<ClassType>)]: Parameters<ClassType[Key]> extends [] ? never : (Parameters<ClassType[Key]>[0] | Parameters<ClassType[Key]>);
};
