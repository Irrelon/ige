"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./entityManager/IgeEntityManager"), exports);
__exportStar(require("./physics/box2d/IgeBox2dController"), exports);
__exportStar(require("./physics/box2d/IgeBox2dDebugPainter"), exports);
//export * from "./physics/box2d/IgeBox2dMultiWorldComponent.js"
//export * from "./physics/box2d/IgeBox2dWorker.js"
//export * from "./physics/box2d/IgeBox2dWorld.js" // Not currently used and not working in TS
__exportStar(require("./physics/box2d/IgeEntityBox2d"), exports);
__exportStar(require("./IgeEntityManagerComponent"), exports);
__exportStar(require("./IgeGamePadComponent"), exports);
__exportStar(require("./IgeInputComponent"), exports);
__exportStar(require("./IgeInputControlMap"), exports);
__exportStar(require("./IgeMousePanComponent"), exports);
__exportStar(require("./IgeMouseZoomComponent"), exports);
__exportStar(require("./IgePathComponent"), exports);
__exportStar(require("./IgeTextureAnimationComponent"), exports);
__exportStar(require("./IgeTiledComponent"), exports);
__exportStar(require("./IgeVelocityComponent"), exports);
