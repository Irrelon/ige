import type { AnyInterface } from "@/types/AnyInterface";
import type { AnyStringToFunctionInterface } from "@/types/AnyStringToFunctionInterface";

export type ClassRecord<ClassType extends AnyInterface<ClassType> = AnyStringToFunctionInterface> = {
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
// const test: ClassRecord<Partial<Test>> = {
// 	fun: "foo"
// };
