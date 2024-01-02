"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerClass = exports.igeClassStore = void 0;
exports.igeClassStore = {};
const registerClass = (cls) => {
    //console.log(`Registering class ${cls.name}`);
    exports.igeClassStore[cls.name] = cls;
};
exports.registerClass = registerClass;
