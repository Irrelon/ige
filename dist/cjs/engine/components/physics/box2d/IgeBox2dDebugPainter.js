"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeBox2dDebugPainter = void 0;
const exports_1 = require("../../../../export/exports.js");
const exports_2 = require("../../../../export/exports.js");
const exports_3 = require("../../../../export/exports.js");
// TODO: Check if this is still supported with the new version of Box2d we are using. Does DrawDebugData() need calling?
class IgeBox2dDebugPainter extends exports_2.IgeEntity {
    constructor(entity, options) {
        super();
        this.classId = "IgeBox2dDebugPainter";
        this._entity = entity;
        this._options = options;
    }
    tick(ctx) {
        var _a;
        if (this._parent && this._parent.isometricMounts()) {
            ctx.scale(1.414, 0.707); // This should be super-accurate now
            ctx.rotate((45 * Math.PI) / 180);
        }
        // TODO: This should use something like this.m_world.SetDebugDraw(g_debugDraw); instead now, where g_debugDraw is a Draw instance
        // @ts-ignore
        (_a = exports_1.ige.box2d._world) === null || _a === void 0 ? void 0 : _a.DrawDebugData();
        super.tick(ctx);
    }
}
exports.IgeBox2dDebugPainter = IgeBox2dDebugPainter;
(0, exports_3.registerClass)(IgeBox2dDebugPainter);
