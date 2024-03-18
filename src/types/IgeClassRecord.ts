import type { IgeAnyInterface } from "@/types/IgeAnyInterface";
import type { IgeAnyStringToFunctionInterface } from "@/types/IgeAnyStringToFunctionInterface";

export type IgeClassRecord<ClassType extends IgeAnyInterface<ClassType> = IgeAnyStringToFunctionInterface> = {
	// @ts-ignore
	[Key in (keyof Partial<ClassType>)]: Parameters<ClassType[Key]> extends [] ? never : (Parameters<ClassType[Key]>[0] | Parameters<ClassType[Key]>)
}

// class Test {
// 	fun (a?: string) {
// 		return a ? a : this;
// 	}
//
// 	none () {
// 	}
// }
//
// const test: IgeClassRecord<Partial<Test>> = {
// 	fun: "foo"
// };
