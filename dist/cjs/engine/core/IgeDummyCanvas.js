"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeDummyCanvas = void 0;
const IgeDummyContext_1 = require("./IgeDummyContext.js");
class IgeDummyCanvas {
    constructor() {
        this.dummy = true;
        this.width = 0;
        this.height = 0;
        this.getContext = (type) => {
            return new IgeDummyContext_1.IgeDummyContext();
        };
    }
}
exports.IgeDummyCanvas = IgeDummyCanvas;
