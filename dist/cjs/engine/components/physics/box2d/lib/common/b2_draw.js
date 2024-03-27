"use strict";
/*
* Copyright (c) 2011 Erin Catto http://box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2Draw = exports.b2DrawFlags = exports.b2TypedColor = exports.b2Color = void 0;
/// Color for debug drawing. Each value has the range [0,1].
class b2Color {
    constructor(r = 0.5, g = 0.5, b = 0.5, a = 1.0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    static MixColors(colorA, colorB, strength) {
        const dr = (strength * (colorB.r - colorA.r));
        const dg = (strength * (colorB.g - colorA.g));
        const db = (strength * (colorB.b - colorA.b));
        const da = (strength * (colorB.a - colorA.a));
        colorA.r += dr;
        colorA.g += dg;
        colorA.b += db;
        colorA.a += da;
        colorB.r -= dr;
        colorB.g -= dg;
        colorB.b -= db;
        colorB.a -= da;
    }
    static MakeStyleString(r, g, b, a = 1.0) {
        // function clamp(x: number, lo: number, hi: number) { return x < lo ? lo : hi < x ? hi : x; }
        r *= 255; // r = clamp(r, 0, 255);
        g *= 255; // g = clamp(g, 0, 255);
        b *= 255; // b = clamp(b, 0, 255);
        // a = clamp(a, 0, 1);
        if (a < 1) {
            return `rgba(${r},${g},${b},${a})`;
        }
        else {
            return `rgb(${r},${g},${b})`;
        }
    }
    Clone() {
        return new b2Color().Copy(this);
    }
    Copy(other) {
        this.r = other.r;
        this.g = other.g;
        this.b = other.b;
        this.a = other.a;
        return this;
    }
    IsEqual(color) {
        return (this.r === color.r) && (this.g === color.g) && (this.b === color.b) && (this.a === color.a);
    }
    IsZero() {
        return (this.r === 0) && (this.g === 0) && (this.b === 0) && (this.a === 0);
    }
    Set(r, g, b, a = this.a) {
        this.SetRGBA(r, g, b, a);
    }
    SetByteRGB(r, g, b) {
        this.r = r / 0xff;
        this.g = g / 0xff;
        this.b = b / 0xff;
        return this;
    }
    SetByteRGBA(r, g, b, a) {
        this.r = r / 0xff;
        this.g = g / 0xff;
        this.b = b / 0xff;
        this.a = a / 0xff;
        return this;
    }
    SetRGB(rr, gg, bb) {
        this.r = rr;
        this.g = gg;
        this.b = bb;
        return this;
    }
    SetRGBA(rr, gg, bb, aa) {
        this.r = rr;
        this.g = gg;
        this.b = bb;
        this.a = aa;
        return this;
    }
    SelfAdd(color) {
        this.r += color.r;
        this.g += color.g;
        this.b += color.b;
        this.a += color.a;
        return this;
    }
    Add(color, out) {
        out.r = this.r + color.r;
        out.g = this.g + color.g;
        out.b = this.b + color.b;
        out.a = this.a + color.a;
        return out;
    }
    SelfSub(color) {
        this.r -= color.r;
        this.g -= color.g;
        this.b -= color.b;
        this.a -= color.a;
        return this;
    }
    Sub(color, out) {
        out.r = this.r - color.r;
        out.g = this.g - color.g;
        out.b = this.b - color.b;
        out.a = this.a - color.a;
        return out;
    }
    SelfMul(s) {
        this.r *= s;
        this.g *= s;
        this.b *= s;
        this.a *= s;
        return this;
    }
    Mul(s, out) {
        out.r = this.r * s;
        out.g = this.g * s;
        out.b = this.b * s;
        out.a = this.a * s;
        return out;
    }
    Mix(mixColor, strength) {
        b2Color.MixColors(this, mixColor, strength);
    }
    MakeStyleString(alpha = this.a) {
        return b2Color.MakeStyleString(this.r, this.g, this.b, alpha);
    }
}
exports.b2Color = b2Color;
b2Color.ZERO = new b2Color(0, 0, 0, 0);
b2Color.RED = new b2Color(1, 0, 0);
b2Color.GREEN = new b2Color(0, 1, 0);
b2Color.BLUE = new b2Color(0, 0, 1);
class b2TypedColor {
    constructor(...args) {
        if (args[0] instanceof Float32Array) {
            if (args[0].length !== 4) {
                throw new Error();
            }
            this.data = args[0];
        }
        else {
            const rr = typeof args[0] === "number" ? args[0] : 0.5;
            const gg = typeof args[1] === "number" ? args[1] : 0.5;
            const bb = typeof args[2] === "number" ? args[2] : 0.5;
            const aa = typeof args[3] === "number" ? args[3] : 1.0;
            this.data = new Float32Array([rr, gg, bb, aa]);
        }
    }
    get r() {
        return this.data[0];
    }
    set r(value) {
        this.data[0] = value;
    }
    get g() {
        return this.data[1];
    }
    set g(value) {
        this.data[1] = value;
    }
    get b() {
        return this.data[2];
    }
    set b(value) {
        this.data[2] = value;
    }
    get a() {
        return this.data[3];
    }
    set a(value) {
        this.data[3] = value;
    }
    Clone() {
        return new b2TypedColor(new Float32Array(this.data));
    }
    Copy(other) {
        if (other instanceof b2TypedColor) {
            this.data.set(other.data);
        }
        else {
            this.r = other.r;
            this.g = other.g;
            this.b = other.b;
            this.a = other.a;
        }
        return this;
    }
    IsEqual(color) {
        return (this.r === color.r) && (this.g === color.g) && (this.b === color.b) && (this.a === color.a);
    }
    IsZero() {
        return (this.r === 0) && (this.g === 0) && (this.b === 0) && (this.a === 0);
    }
    Set(r, g, b, a = this.a) {
        this.SetRGBA(r, g, b, a);
    }
    SetByteRGB(r, g, b) {
        this.r = r / 0xff;
        this.g = g / 0xff;
        this.b = b / 0xff;
        return this;
    }
    SetByteRGBA(r, g, b, a) {
        this.r = r / 0xff;
        this.g = g / 0xff;
        this.b = b / 0xff;
        this.a = a / 0xff;
        return this;
    }
    SetRGB(rr, gg, bb) {
        this.r = rr;
        this.g = gg;
        this.b = bb;
        return this;
    }
    SetRGBA(rr, gg, bb, aa) {
        this.r = rr;
        this.g = gg;
        this.b = bb;
        this.a = aa;
        return this;
    }
    SelfAdd(color) {
        this.r += color.r;
        this.g += color.g;
        this.b += color.b;
        this.a += color.a;
        return this;
    }
    Add(color, out) {
        out.r = this.r + color.r;
        out.g = this.g + color.g;
        out.b = this.b + color.b;
        out.a = this.a + color.a;
        return out;
    }
    SelfSub(color) {
        this.r -= color.r;
        this.g -= color.g;
        this.b -= color.b;
        this.a -= color.a;
        return this;
    }
    Sub(color, out) {
        out.r = this.r - color.r;
        out.g = this.g - color.g;
        out.b = this.b - color.b;
        out.a = this.a - color.a;
        return out;
    }
    SelfMul(s) {
        this.r *= s;
        this.g *= s;
        this.b *= s;
        this.a *= s;
        return this;
    }
    Mul(s, out) {
        out.r = this.r * s;
        out.g = this.g * s;
        out.b = this.b * s;
        out.a = this.a * s;
        return out;
    }
    Mix(mixColor, strength) {
        b2Color.MixColors(this, mixColor, strength);
    }
    MakeStyleString(alpha = this.a) {
        return b2Color.MakeStyleString(this.r, this.g, this.b, alpha);
    }
}
exports.b2TypedColor = b2TypedColor;
var b2DrawFlags;
(function (b2DrawFlags) {
    b2DrawFlags[b2DrawFlags["e_none"] = 0] = "e_none";
    b2DrawFlags[b2DrawFlags["e_shapeBit"] = 1] = "e_shapeBit";
    b2DrawFlags[b2DrawFlags["e_jointBit"] = 2] = "e_jointBit";
    b2DrawFlags[b2DrawFlags["e_aabbBit"] = 4] = "e_aabbBit";
    b2DrawFlags[b2DrawFlags["e_pairBit"] = 8] = "e_pairBit";
    b2DrawFlags[b2DrawFlags["e_centerOfMassBit"] = 16] = "e_centerOfMassBit";
    // #if B2_ENABLE_PARTICLE
    b2DrawFlags[b2DrawFlags["e_particleBit"] = 32] = "e_particleBit";
    // #endif
    // #if B2_ENABLE_CONTROLLER
    b2DrawFlags[b2DrawFlags["e_controllerBit"] = 64] = "e_controllerBit";
    // #endif
    b2DrawFlags[b2DrawFlags["e_all"] = 63] = "e_all";
})(b2DrawFlags || (exports.b2DrawFlags = b2DrawFlags = {}));
/// Implement and register this class with a b2World to provide debug drawing of physics
/// entities in your game.
class b2Draw {
    constructor() {
        this.m_drawFlags = 0;
    }
    SetFlags(flags) {
        this.m_drawFlags = flags;
    }
    GetFlags() {
        return this.m_drawFlags;
    }
    AppendFlags(flags) {
        this.m_drawFlags |= flags;
    }
    ClearFlags(flags) {
        this.m_drawFlags &= ~flags;
    }
}
exports.b2Draw = b2Draw;
