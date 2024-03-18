import type { IgeBaseClass } from "@/engine/core/IgeBaseClass";

export const mixin = (targetObject: IgeBaseClass, mixinObj: any, overwrite = false) => {
	const obj = mixinObj.prototype || mixinObj;

	// Copy the class object's properties to (this)
	for (const key in obj) {
		// Only copy the property if this doesn't already have it
		// @ts-ignore
		if (Object.prototype.hasOwnProperty.call(obj, key) && (overwrite || targetObject[key] === undefined)) {
			// @ts-ignore
			targetObject[key] = obj[key];
		}
	}
};
