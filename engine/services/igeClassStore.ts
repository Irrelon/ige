import { GenericClass } from "../../types/GenericClass";

export const igeClassStore: Record<string, GenericClass> = {};
export const registerClass = (cls: GenericClass) => {
	console.log("Registering class");
	igeClassStore[cls.name] = cls;
}

