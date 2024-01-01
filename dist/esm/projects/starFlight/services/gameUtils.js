import { modules } from "../app/data/modules.js"
/**
 * Extends the target with data from the newData object.
 * If overwrite is false, only data that is undefined in
 * the target is set from data in the newData object.
 * @param target
 * @param newData
 * @param overwrite
 */
export const extend = function (target, newData, overwrite = false) {
    for (const i in newData) {
        if (newData.hasOwnProperty(i)) {
            // Check if this property is an object
            if (typeof newData[i] === 'object' && !(newData[i] instanceof Array)) {
                // Make sure the target property is an object
                if (target[i] === undefined) {
                    target[i] = {};
                }
                // Recurse extend
                extend(target[i], newData[i], overwrite);
            }
            else if (overwrite || target[i] === undefined) {
                target[i] = JSON.parse(JSON.stringify(newData[i]));
            }
        }
    }
};
/**
 * Gets a module's default data by its ID.
 * @param {String} moduleId The ID of the module to get.
 * @returns {*}
 */
export const getModuleById = function (moduleId) {
    for (let i = 0; i < modules.length; i++) {
        if (modules[i]._id === moduleId) {
            return modules[i];
        }
    }
    return undefined;
};
/**
 * Generates a modules object with properties that contain
 * each module based on the moduleId.
 * @param {Array} moduleArr
 * @returns {Array}
 */
export const generateModuleObject = function (moduleArr) {
    const moduleObj = {};
    for (let i = 0; i < moduleArr.length; i++) {
        const currentModuleData = moduleArr[i];
        const defaultModuleData = getModuleById(currentModuleData.moduleId);
        moduleObj[currentModuleData._id] = currentModuleData;
        if (!defaultModuleData) {
            continue;
        }
        extend(currentModuleData, defaultModuleData, false);
    }
    return moduleObj;
};
