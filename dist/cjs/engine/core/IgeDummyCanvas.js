"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeDummyCanvas = void 0;
const exports_1 = require("../../export/exports.js");
class IgeDummyCanvas {
    constructor() {
        this.dummy = true;
        this.width = 0;
        this.height = 0;
        this.getContext = (type) => {
            return new exports_1.IgeDummyContext();
        };
    }
}
exports.IgeDummyCanvas = IgeDummyCanvas;
