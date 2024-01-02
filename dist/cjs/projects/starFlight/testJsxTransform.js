"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scene = void 0;
const jsx_runtime_1 = require("ige-jsx/jsx-runtime");
const IgeUiEntity_1 = require("../../engine/core/IgeUiEntity.js");
const Scene = () => {
    return ((0, jsx_runtime_1.jsx)(IgeUiEntity_1.IgeUiEntity, Object.assign({ left: 10, bottom: 10, width: 200, height: 50 }, { children: (0, jsx_runtime_1.jsx)(IgeEntity, { texture: "fairy" }) })));
};
exports.Scene = Scene;
