"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesize = void 0;
function synthesize(Class, methodName, shouldStreamChange = false) {
    const privatePropertyName = `_${methodName}`;
    Class.prototype[methodName] = function (val) {
        if (val === undefined) {
            return this[privatePropertyName];
        }
        this[privatePropertyName] = val;
        if (shouldStreamChange) {
            this.streamProperty(methodName, val);
        }
        return this;
    };
}
exports.synthesize = synthesize;
