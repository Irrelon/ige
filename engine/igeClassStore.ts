import type { GenericClass } from "@/types/GenericClass";

export const igeClassStore: Record<string, GenericClass> = {};
export const registerClass = (cls: GenericClass) => {
	console.log(`Registering class ${cls.name}`);
	igeClassStore[cls.name] = cls;
}

