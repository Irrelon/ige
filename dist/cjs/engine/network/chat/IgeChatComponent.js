"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeChatComponent = void 0;
const IgeEventingClass_1 = require("@/engine/core/IgeEventingClass");
class IgeChatComponent extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeChatComponent";
        this.componentId = "chat";
        this._rooms = {};
    }
}
exports.IgeChatComponent = IgeChatComponent;
