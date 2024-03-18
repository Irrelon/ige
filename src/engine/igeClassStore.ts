import type { IgeGenericClass } from "@/export/exports";

export const igeClassStore: Record<string, IgeGenericClass> = {};
export const registerClass = (cls: IgeGenericClass) => {
	//console.log(`Registering class ${cls.name}`);
	igeClassStore[cls.name] = cls;
};
