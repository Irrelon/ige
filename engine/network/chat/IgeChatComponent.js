import { IgeEventingClass } from "../../../engine/core/IgeEventingClass.js";
export class IgeChatComponent extends IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeChatComponent";
        this.componentId = "chat";
        this._rooms = {};
    }
}
