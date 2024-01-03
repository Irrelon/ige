"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeChatComponent = void 0;
const exports_1 = require("../../../export/exports.js");
class IgeChatComponent extends exports_1.IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeChatComponent";
        this.componentId = "chat";
        this._rooms = {};
    }
}
exports.IgeChatComponent = IgeChatComponent;
