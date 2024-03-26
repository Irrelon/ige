"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixin = void 0;
const mixin = (targetObject, mixinObj, overwrite = false) => {
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
exports.mixin = mixin;
