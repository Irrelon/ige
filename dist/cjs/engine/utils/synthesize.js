"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesize = void 0;
/**
 * Creates a getter/setter method on the passed `Class` via
 * its prototype. This saves us from having to constantly
 * write out the same getter/setter pattern over and over for
 * every method that follows it.
 * @param Class
 * @param methodName
 * @param shouldStreamChange
 */
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
