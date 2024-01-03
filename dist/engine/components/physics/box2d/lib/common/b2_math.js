/*
* Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
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
// DEBUG: import { b2Assert } from "./b2_settings.js"
import { b2_pi, b2_epsilon, b2MakeArray } from "./b2_settings.js"
export const b2_pi_over_180 = b2_pi / 180;
export const b2_180_over_pi = 180 / b2_pi;
export const b2_two_pi = 2 * b2_pi;
export const b2Abs = Math.abs;
export function b2Min(a, b) { return a < b ? a : b; }
export function b2Max(a, b) { return a > b ? a : b; }
export function b2Clamp(a, lo, hi) {
    return (a < lo) ? (lo) : ((a > hi) ? (hi) : (a));
}
export function b2Swap(a, b) {
    // DEBUG: b2Assert(false);
    const tmp = a[0];
    a[0] = b[0];
    b[0] = tmp;
}
/// This function is used to ensure that a floating point number is
/// not a NaN or infinity.
export const b2IsValid = isFinite;
export function b2Sq(n) {
    return n * n;
}
/// This is a approximate yet fast inverse square-root.
export function b2InvSqrt(n) {
    return 1 / Math.sqrt(n);
}
export const b2Sqrt = Math.sqrt;
export const b2Pow = Math.pow;
export function b2DegToRad(degrees) {
    return degrees * b2_pi_over_180;
}
export function b2RadToDeg(radians) {
    return radians * b2_180_over_pi;
}
export const b2Cos = Math.cos;
export const b2Sin = Math.sin;
export const b2Acos = Math.acos;
export const b2Asin = Math.asin;
export const b2Atan2 = Math.atan2;
export function b2NextPowerOfTwo(x) {
    x |= (x >> 1) & 0x7FFFFFFF;
    x |= (x >> 2) & 0x3FFFFFFF;
    x |= (x >> 4) & 0x0FFFFFFF;
    x |= (x >> 8) & 0x00FFFFFF;
    x |= (x >> 16) & 0x0000FFFF;
    return x + 1;
}
export function b2IsPowerOfTwo(x) {
    return x > 0 && (x & (x - 1)) === 0;
}
export function b2Random() {
    return Math.random() * 2 - 1;
}
export function b2RandomRange(lo, hi) {
    return (hi - lo) * Math.random() + lo;
}
/// A 2D column vector.
export class b2Vec2 {
    x;
    y;
    static ZERO = new b2Vec2(0, 0);
    static UNITX = new b2Vec2(1, 0);
    static UNITY = new b2Vec2(0, 1);
    static s_t0 = new b2Vec2();
    static s_t1 = new b2Vec2();
    static s_t2 = new b2Vec2();
    static s_t3 = new b2Vec2();
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    Clone() {
        return new b2Vec2(this.x, this.y);
    }
    SetZero() {
        this.x = 0;
        this.y = 0;
        return this;
    }
    Set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    Copy(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }
    SelfAdd(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    SelfAddXY(x, y) {
        this.x += x;
        this.y += y;
        return this;
    }
    SelfSub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    SelfSubXY(x, y) {
        this.x -= x;
        this.y -= y;
        return this;
    }
    SelfMul(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    SelfMulAdd(s, v) {
        this.x += s * v.x;
        this.y += s * v.y;
        return this;
    }
    SelfMulSub(s, v) {
        this.x -= s * v.x;
        this.y -= s * v.y;
        return this;
    }
    Dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    Cross(v) {
        return this.x * v.y - this.y * v.x;
    }
    Length() {
        const x = this.x, y = this.y;
        return Math.sqrt(x * x + y * y);
    }
    LengthSquared() {
        const x = this.x, y = this.y;
        return (x * x + y * y);
    }
    Normalize() {
        const length = this.Length();
        if (length >= b2_epsilon) {
            const inv_length = 1 / length;
            this.x *= inv_length;
            this.y *= inv_length;
        }
        return length;
    }
    SelfNormalize() {
        const length = this.Length();
        if (length >= b2_epsilon) {
            const inv_length = 1 / length;
            this.x *= inv_length;
            this.y *= inv_length;
        }
        return this;
    }
    SelfRotate(radians) {
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        const x = this.x;
        this.x = c * x - s * this.y;
        this.y = s * x + c * this.y;
        return this;
    }
    SelfRotateCosSin(c, s) {
        const x = this.x;
        this.x = c * x - s * this.y;
        this.y = s * x + c * this.y;
        return this;
    }
    IsValid() {
        return isFinite(this.x) && isFinite(this.y);
    }
    SelfCrossVS(s) {
        const x = this.x;
        this.x = s * this.y;
        this.y = -s * x;
        return this;
    }
    SelfCrossSV(s) {
        const x = this.x;
        this.x = -s * this.y;
        this.y = s * x;
        return this;
    }
    SelfMinV(v) {
        this.x = b2Min(this.x, v.x);
        this.y = b2Min(this.y, v.y);
        return this;
    }
    SelfMaxV(v) {
        this.x = b2Max(this.x, v.x);
        this.y = b2Max(this.y, v.y);
        return this;
    }
    SelfAbs() {
        this.x = b2Abs(this.x);
        this.y = b2Abs(this.y);
        return this;
    }
    SelfNeg() {
        this.x = (-this.x);
        this.y = (-this.y);
        return this;
    }
    SelfSkew() {
        const x = this.x;
        this.x = -this.y;
        this.y = x;
        return this;
    }
    static MakeArray(length) {
        return b2MakeArray(length, (i) => new b2Vec2());
    }
    static AbsV(v, out) {
        out.x = b2Abs(v.x);
        out.y = b2Abs(v.y);
        return out;
    }
    static MinV(a, b, out) {
        out.x = b2Min(a.x, b.x);
        out.y = b2Min(a.y, b.y);
        return out;
    }
    static MaxV(a, b, out) {
        out.x = b2Max(a.x, b.x);
        out.y = b2Max(a.y, b.y);
        return out;
    }
    static ClampV(v, lo, hi, out) {
        out.x = b2Clamp(v.x, lo.x, hi.x);
        out.y = b2Clamp(v.y, lo.y, hi.y);
        return out;
    }
    static RotateV(v, radians, out) {
        const v_x = v.x, v_y = v.y;
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        out.x = c * v_x - s * v_y;
        out.y = s * v_x + c * v_y;
        return out;
    }
    static DotVV(a, b) {
        return a.x * b.x + a.y * b.y;
    }
    static CrossVV(a, b) {
        return a.x * b.y - a.y * b.x;
    }
    static CrossVS(v, s, out) {
        const v_x = v.x;
        out.x = s * v.y;
        out.y = -s * v_x;
        return out;
    }
    static CrossVOne(v, out) {
        const v_x = v.x;
        out.x = v.y;
        out.y = -v_x;
        return out;
    }
    static CrossSV(s, v, out) {
        const v_x = v.x;
        out.x = -s * v.y;
        out.y = s * v_x;
        return out;
    }
    static CrossOneV(v, out) {
        const v_x = v.x;
        out.x = -v.y;
        out.y = v_x;
        return out;
    }
    static AddVV(a, b, out) { out.x = a.x + b.x; out.y = a.y + b.y; return out; }
    static SubVV(a, b, out) { out.x = a.x - b.x; out.y = a.y - b.y; return out; }
    static MulSV(s, v, out) { out.x = v.x * s; out.y = v.y * s; return out; }
    static MulVS(v, s, out) { out.x = v.x * s; out.y = v.y * s; return out; }
    static AddVMulSV(a, s, b, out) { out.x = a.x + (s * b.x); out.y = a.y + (s * b.y); return out; }
    static SubVMulSV(a, s, b, out) { out.x = a.x - (s * b.x); out.y = a.y - (s * b.y); return out; }
    static AddVCrossSV(a, s, v, out) {
        const v_x = v.x;
        out.x = a.x - (s * v.y);
        out.y = a.y + (s * v_x);
        return out;
    }
    static MidVV(a, b, out) { out.x = (a.x + b.x) * 0.5; out.y = (a.y + b.y) * 0.5; return out; }
    static ExtVV(a, b, out) { out.x = (b.x - a.x) * 0.5; out.y = (b.y - a.y) * 0.5; return out; }
    static IsEqualToV(a, b) {
        return a.x === b.x && a.y === b.y;
    }
    static DistanceVV(a, b) {
        const c_x = a.x - b.x;
        const c_y = a.y - b.y;
        return Math.sqrt(c_x * c_x + c_y * c_y);
    }
    static DistanceSquaredVV(a, b) {
        const c_x = a.x - b.x;
        const c_y = a.y - b.y;
        return (c_x * c_x + c_y * c_y);
    }
    static NegV(v, out) { out.x = -v.x; out.y = -v.y; return out; }
}
export const b2Vec2_zero = new b2Vec2(0, 0);
export class b2TypedVec2 {
    data;
    get x() { return this.data[0]; }
    set x(value) { this.data[0] = value; }
    get y() { return this.data[1]; }
    set y(value) { this.data[1] = value; }
    constructor(...args) {
        if (args[0] instanceof Float32Array) {
            if (args[0].length !== 2) {
                throw new Error();
            }
            this.data = args[0];
        }
        else {
            const x = typeof args[0] === "number" ? args[0] : 0;
            const y = typeof args[1] === "number" ? args[1] : 0;
            this.data = new Float32Array([x, y]);
        }
    }
    Clone() {
        return new b2TypedVec2(new Float32Array(this.data));
    }
    SetZero() {
        this.x = 0;
        this.y = 0;
        return this;
    }
    Set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    Copy(other) {
        if (other instanceof b2TypedVec2) {
            this.data.set(other.data);
        }
        else {
            this.x = other.x;
            this.y = other.y;
        }
        return this;
    }
    SelfAdd(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    SelfAddXY(x, y) {
        this.x += x;
        this.y += y;
        return this;
    }
    SelfSub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    SelfSubXY(x, y) {
        this.x -= x;
        this.y -= y;
        return this;
    }
    SelfMul(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    SelfMulAdd(s, v) {
        this.x += s * v.x;
        this.y += s * v.y;
        return this;
    }
    SelfMulSub(s, v) {
        this.x -= s * v.x;
        this.y -= s * v.y;
        return this;
    }
    Dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    Cross(v) {
        return this.x * v.y - this.y * v.x;
    }
    Length() {
        const x = this.x, y = this.y;
        return Math.sqrt(x * x + y * y);
    }
    LengthSquared() {
        const x = this.x, y = this.y;
        return (x * x + y * y);
    }
    Normalize() {
        const length = this.Length();
        if (length >= b2_epsilon) {
            const inv_length = 1 / length;
            this.x *= inv_length;
            this.y *= inv_length;
        }
        return length;
    }
    SelfNormalize() {
        const length = this.Length();
        if (length >= b2_epsilon) {
            const inv_length = 1 / length;
            this.x *= inv_length;
            this.y *= inv_length;
        }
        return this;
    }
    SelfRotate(radians) {
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        const x = this.x;
        this.x = c * x - s * this.y;
        this.y = s * x + c * this.y;
        return this;
    }
    SelfRotateCosSin(c, s) {
        const x = this.x;
        this.x = c * x - s * this.y;
        this.y = s * x + c * this.y;
        return this;
    }
    IsValid() {
        return isFinite(this.x) && isFinite(this.y);
    }
    SelfCrossVS(s) {
        const x = this.x;
        this.x = s * this.y;
        this.y = -s * x;
        return this;
    }
    SelfCrossSV(s) {
        const x = this.x;
        this.x = -s * this.y;
        this.y = s * x;
        return this;
    }
    SelfMinV(v) {
        this.x = b2Min(this.x, v.x);
        this.y = b2Min(this.y, v.y);
        return this;
    }
    SelfMaxV(v) {
        this.x = b2Max(this.x, v.x);
        this.y = b2Max(this.y, v.y);
        return this;
    }
    SelfAbs() {
        this.x = b2Abs(this.x);
        this.y = b2Abs(this.y);
        return this;
    }
    SelfNeg() {
        this.x = (-this.x);
        this.y = (-this.y);
        return this;
    }
    SelfSkew() {
        const x = this.x;
        this.x = -this.y;
        this.y = x;
        return this;
    }
}
/// A 2D column vector with 3 elements.
export class b2Vec3 {
    static ZERO = new b2Vec3(0, 0, 0);
    static s_t0 = new b2Vec3();
    data;
    get x() { return this.data[0]; }
    set x(value) { this.data[0] = value; }
    get y() { return this.data[1]; }
    set y(value) { this.data[1] = value; }
    get z() { return this.data[2]; }
    set z(value) { this.data[2] = value; }
    constructor(...args) {
        if (args[0] instanceof Float32Array) {
            if (args[0].length !== 3) {
                throw new Error();
            }
            this.data = args[0];
        }
        else {
            const x = typeof args[0] === "number" ? args[0] : 0;
            const y = typeof args[1] === "number" ? args[1] : 0;
            const z = typeof args[2] === "number" ? args[2] : 0;
            this.data = new Float32Array([x, y, z]);
        }
    }
    Clone() {
        return new b2Vec3(this.x, this.y, this.z);
    }
    SetZero() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        return this;
    }
    SetXYZ(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    Copy(other) {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        return this;
    }
    SelfNeg() {
        this.x = (-this.x);
        this.y = (-this.y);
        this.z = (-this.z);
        return this;
    }
    SelfAdd(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    SelfAddXYZ(x, y, z) {
        this.x += x;
        this.y += y;
        this.z += z;
        return this;
    }
    SelfSub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    SelfSubXYZ(x, y, z) {
        this.x -= x;
        this.y -= y;
        this.z -= z;
        return this;
    }
    SelfMul(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }
    static DotV3V3(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    static CrossV3V3(a, b, out) {
        const a_x = a.x, a_y = a.y, a_z = a.z;
        const b_x = b.x, b_y = b.y, b_z = b.z;
        out.x = a_y * b_z - a_z * b_y;
        out.y = a_z * b_x - a_x * b_z;
        out.z = a_x * b_y - a_y * b_x;
        return out;
    }
}
/// A 2-by-2 matrix. Stored in column-major order.
export class b2Mat22 {
    static IDENTITY = new b2Mat22();
    // public readonly data: Float32Array = new Float32Array([ 1, 0, 0, 1 ]);
    // public readonly ex: b2Vec2 = new b2Vec2(this.data.subarray(0, 2));
    // public readonly ey: b2Vec2 = new b2Vec2(this.data.subarray(2, 4));
    ex = new b2Vec2(1, 0);
    ey = new b2Vec2(0, 1);
    Clone() {
        return new b2Mat22().Copy(this);
    }
    static FromVV(c1, c2) {
        return new b2Mat22().SetVV(c1, c2);
    }
    static FromSSSS(r1c1, r1c2, r2c1, r2c2) {
        return new b2Mat22().SetSSSS(r1c1, r1c2, r2c1, r2c2);
    }
    static FromAngle(radians) {
        return new b2Mat22().SetAngle(radians);
    }
    SetSSSS(r1c1, r1c2, r2c1, r2c2) {
        this.ex.Set(r1c1, r2c1);
        this.ey.Set(r1c2, r2c2);
        return this;
    }
    SetVV(c1, c2) {
        this.ex.Copy(c1);
        this.ey.Copy(c2);
        return this;
    }
    SetAngle(radians) {
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        this.ex.Set(c, s);
        this.ey.Set(-s, c);
        return this;
    }
    Copy(other) {
        this.ex.Copy(other.ex);
        this.ey.Copy(other.ey);
        return this;
    }
    SetIdentity() {
        this.ex.Set(1, 0);
        this.ey.Set(0, 1);
        return this;
    }
    SetZero() {
        this.ex.SetZero();
        this.ey.SetZero();
        return this;
    }
    GetAngle() {
        return Math.atan2(this.ex.y, this.ex.x);
    }
    GetInverse(out) {
        const a = this.ex.x;
        const b = this.ey.x;
        const c = this.ex.y;
        const d = this.ey.y;
        let det = a * d - b * c;
        if (det !== 0) {
            det = 1 / det;
        }
        out.ex.x = det * d;
        out.ey.x = (-det * b);
        out.ex.y = (-det * c);
        out.ey.y = det * a;
        return out;
    }
    Solve(b_x, b_y, out) {
        const a11 = this.ex.x, a12 = this.ey.x;
        const a21 = this.ex.y, a22 = this.ey.y;
        let det = a11 * a22 - a12 * a21;
        if (det !== 0) {
            det = 1 / det;
        }
        out.x = det * (a22 * b_x - a12 * b_y);
        out.y = det * (a11 * b_y - a21 * b_x);
        return out;
    }
    SelfAbs() {
        this.ex.SelfAbs();
        this.ey.SelfAbs();
        return this;
    }
    SelfInv() {
        this.GetInverse(this);
        return this;
    }
    SelfAddM(M) {
        this.ex.SelfAdd(M.ex);
        this.ey.SelfAdd(M.ey);
        return this;
    }
    SelfSubM(M) {
        this.ex.SelfSub(M.ex);
        this.ey.SelfSub(M.ey);
        return this;
    }
    static AbsM(M, out) {
        const M_ex = M.ex, M_ey = M.ey;
        out.ex.x = b2Abs(M_ex.x);
        out.ex.y = b2Abs(M_ex.y);
        out.ey.x = b2Abs(M_ey.x);
        out.ey.y = b2Abs(M_ey.y);
        return out;
    }
    static MulMV(M, v, out) {
        const M_ex = M.ex, M_ey = M.ey;
        const v_x = v.x, v_y = v.y;
        out.x = M_ex.x * v_x + M_ey.x * v_y;
        out.y = M_ex.y * v_x + M_ey.y * v_y;
        return out;
    }
    static MulTMV(M, v, out) {
        const M_ex = M.ex, M_ey = M.ey;
        const v_x = v.x, v_y = v.y;
        out.x = M_ex.x * v_x + M_ex.y * v_y;
        out.y = M_ey.x * v_x + M_ey.y * v_y;
        return out;
    }
    static AddMM(A, B, out) {
        const A_ex = A.ex, A_ey = A.ey;
        const B_ex = B.ex, B_ey = B.ey;
        out.ex.x = A_ex.x + B_ex.x;
        out.ex.y = A_ex.y + B_ex.y;
        out.ey.x = A_ey.x + B_ey.x;
        out.ey.y = A_ey.y + B_ey.y;
        return out;
    }
    static MulMM(A, B, out) {
        const A_ex_x = A.ex.x, A_ex_y = A.ex.y;
        const A_ey_x = A.ey.x, A_ey_y = A.ey.y;
        const B_ex_x = B.ex.x, B_ex_y = B.ex.y;
        const B_ey_x = B.ey.x, B_ey_y = B.ey.y;
        out.ex.x = A_ex_x * B_ex_x + A_ey_x * B_ex_y;
        out.ex.y = A_ex_y * B_ex_x + A_ey_y * B_ex_y;
        out.ey.x = A_ex_x * B_ey_x + A_ey_x * B_ey_y;
        out.ey.y = A_ex_y * B_ey_x + A_ey_y * B_ey_y;
        return out;
    }
    static MulTMM(A, B, out) {
        const A_ex_x = A.ex.x, A_ex_y = A.ex.y;
        const A_ey_x = A.ey.x, A_ey_y = A.ey.y;
        const B_ex_x = B.ex.x, B_ex_y = B.ex.y;
        const B_ey_x = B.ey.x, B_ey_y = B.ey.y;
        out.ex.x = A_ex_x * B_ex_x + A_ex_y * B_ex_y;
        out.ex.y = A_ey_x * B_ex_x + A_ey_y * B_ex_y;
        out.ey.x = A_ex_x * B_ey_x + A_ex_y * B_ey_y;
        out.ey.y = A_ey_x * B_ey_x + A_ey_y * B_ey_y;
        return out;
    }
}
/// A 3-by-3 matrix. Stored in column-major order.
export class b2Mat33 {
    static IDENTITY = new b2Mat33();
    data = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    ex = new b2Vec3(this.data.subarray(0, 3));
    ey = new b2Vec3(this.data.subarray(3, 6));
    ez = new b2Vec3(this.data.subarray(6, 9));
    Clone() {
        return new b2Mat33().Copy(this);
    }
    SetVVV(c1, c2, c3) {
        this.ex.Copy(c1);
        this.ey.Copy(c2);
        this.ez.Copy(c3);
        return this;
    }
    Copy(other) {
        this.ex.Copy(other.ex);
        this.ey.Copy(other.ey);
        this.ez.Copy(other.ez);
        return this;
    }
    SetIdentity() {
        this.ex.SetXYZ(1, 0, 0);
        this.ey.SetXYZ(0, 1, 0);
        this.ez.SetXYZ(0, 0, 1);
        return this;
    }
    SetZero() {
        this.ex.SetZero();
        this.ey.SetZero();
        this.ez.SetZero();
        return this;
    }
    SelfAddM(M) {
        this.ex.SelfAdd(M.ex);
        this.ey.SelfAdd(M.ey);
        this.ez.SelfAdd(M.ez);
        return this;
    }
    Solve33(b_x, b_y, b_z, out) {
        const a11 = this.ex.x, a21 = this.ex.y, a31 = this.ex.z;
        const a12 = this.ey.x, a22 = this.ey.y, a32 = this.ey.z;
        const a13 = this.ez.x, a23 = this.ez.y, a33 = this.ez.z;
        let det = a11 * (a22 * a33 - a32 * a23) + a21 * (a32 * a13 - a12 * a33) + a31 * (a12 * a23 - a22 * a13);
        if (det !== 0) {
            det = 1 / det;
        }
        out.x = det * (b_x * (a22 * a33 - a32 * a23) + b_y * (a32 * a13 - a12 * a33) + b_z * (a12 * a23 - a22 * a13));
        out.y = det * (a11 * (b_y * a33 - b_z * a23) + a21 * (b_z * a13 - b_x * a33) + a31 * (b_x * a23 - b_y * a13));
        out.z = det * (a11 * (a22 * b_z - a32 * b_y) + a21 * (a32 * b_x - a12 * b_z) + a31 * (a12 * b_y - a22 * b_x));
        return out;
    }
    Solve22(b_x, b_y, out) {
        const a11 = this.ex.x, a12 = this.ey.x;
        const a21 = this.ex.y, a22 = this.ey.y;
        let det = a11 * a22 - a12 * a21;
        if (det !== 0) {
            det = 1 / det;
        }
        out.x = det * (a22 * b_x - a12 * b_y);
        out.y = det * (a11 * b_y - a21 * b_x);
        return out;
    }
    GetInverse22(M) {
        const a = this.ex.x, b = this.ey.x, c = this.ex.y, d = this.ey.y;
        let det = a * d - b * c;
        if (det !== 0) {
            det = 1 / det;
        }
        M.ex.x = det * d;
        M.ey.x = -det * b;
        M.ex.z = 0;
        M.ex.y = -det * c;
        M.ey.y = det * a;
        M.ey.z = 0;
        M.ez.x = 0;
        M.ez.y = 0;
        M.ez.z = 0;
    }
    GetSymInverse33(M) {
        let det = b2Vec3.DotV3V3(this.ex, b2Vec3.CrossV3V3(this.ey, this.ez, b2Vec3.s_t0));
        if (det !== 0) {
            det = 1 / det;
        }
        const a11 = this.ex.x, a12 = this.ey.x, a13 = this.ez.x;
        const a22 = this.ey.y, a23 = this.ez.y;
        const a33 = this.ez.z;
        M.ex.x = det * (a22 * a33 - a23 * a23);
        M.ex.y = det * (a13 * a23 - a12 * a33);
        M.ex.z = det * (a12 * a23 - a13 * a22);
        M.ey.x = M.ex.y;
        M.ey.y = det * (a11 * a33 - a13 * a13);
        M.ey.z = det * (a13 * a12 - a11 * a23);
        M.ez.x = M.ex.z;
        M.ez.y = M.ey.z;
        M.ez.z = det * (a11 * a22 - a12 * a12);
    }
    static MulM33V3(A, v, out) {
        const v_x = v.x, v_y = v.y, v_z = v.z;
        out.x = A.ex.x * v_x + A.ey.x * v_y + A.ez.x * v_z;
        out.y = A.ex.y * v_x + A.ey.y * v_y + A.ez.y * v_z;
        out.z = A.ex.z * v_x + A.ey.z * v_y + A.ez.z * v_z;
        return out;
    }
    static MulM33XYZ(A, x, y, z, out) {
        out.x = A.ex.x * x + A.ey.x * y + A.ez.x * z;
        out.y = A.ex.y * x + A.ey.y * y + A.ez.y * z;
        out.z = A.ex.z * x + A.ey.z * y + A.ez.z * z;
        return out;
    }
    static MulM33V2(A, v, out) {
        const v_x = v.x, v_y = v.y;
        out.x = A.ex.x * v_x + A.ey.x * v_y;
        out.y = A.ex.y * v_x + A.ey.y * v_y;
        return out;
    }
    static MulM33XY(A, x, y, out) {
        out.x = A.ex.x * x + A.ey.x * y;
        out.y = A.ex.y * x + A.ey.y * y;
        return out;
    }
}
/// Rotation
export class b2Rot {
    static IDENTITY = new b2Rot();
    s = 0;
    c = 1;
    constructor(angle = 0) {
        if (angle) {
            this.s = Math.sin(angle);
            this.c = Math.cos(angle);
        }
    }
    Clone() {
        return new b2Rot().Copy(this);
    }
    Copy(other) {
        this.s = other.s;
        this.c = other.c;
        return this;
    }
    SetAngle(angle) {
        this.s = Math.sin(angle);
        this.c = Math.cos(angle);
        return this;
    }
    SetIdentity() {
        this.s = 0;
        this.c = 1;
        return this;
    }
    GetAngle() {
        return Math.atan2(this.s, this.c);
    }
    GetXAxis(out) {
        out.x = this.c;
        out.y = this.s;
        return out;
    }
    GetYAxis(out) {
        out.x = -this.s;
        out.y = this.c;
        return out;
    }
    static MulRR(q, r, out) {
        // [qc -qs] * [rc -rs] = [qc*rc-qs*rs -qc*rs-qs*rc]
        // [qs  qc]   [rs  rc]   [qs*rc+qc*rs -qs*rs+qc*rc]
        // s = qs * rc + qc * rs
        // c = qc * rc - qs * rs
        const q_c = q.c, q_s = q.s;
        const r_c = r.c, r_s = r.s;
        out.s = q_s * r_c + q_c * r_s;
        out.c = q_c * r_c - q_s * r_s;
        return out;
    }
    static MulTRR(q, r, out) {
        // [ qc qs] * [rc -rs] = [qc*rc+qs*rs -qc*rs+qs*rc]
        // [-qs qc]   [rs  rc]   [-qs*rc+qc*rs qs*rs+qc*rc]
        // s = qc * rs - qs * rc
        // c = qc * rc + qs * rs
        const q_c = q.c, q_s = q.s;
        const r_c = r.c, r_s = r.s;
        out.s = q_c * r_s - q_s * r_c;
        out.c = q_c * r_c + q_s * r_s;
        return out;
    }
    static MulRV(q, v, out) {
        const q_c = q.c, q_s = q.s;
        const v_x = v.x, v_y = v.y;
        out.x = q_c * v_x - q_s * v_y;
        out.y = q_s * v_x + q_c * v_y;
        return out;
    }
    static MulTRV(q, v, out) {
        const q_c = q.c, q_s = q.s;
        const v_x = v.x, v_y = v.y;
        out.x = q_c * v_x + q_s * v_y;
        out.y = -q_s * v_x + q_c * v_y;
        return out;
    }
}
/// A transform contains translation and rotation. It is used to represent
/// the position and orientation of rigid frames.
export class b2Transform {
    static IDENTITY = new b2Transform();
    p = new b2Vec2();
    q = new b2Rot();
    Clone() {
        return new b2Transform().Copy(this);
    }
    Copy(other) {
        this.p.Copy(other.p);
        this.q.Copy(other.q);
        return this;
    }
    SetIdentity() {
        this.p.SetZero();
        this.q.SetIdentity();
        return this;
    }
    SetPositionRotation(position, q) {
        this.p.Copy(position);
        this.q.Copy(q);
        return this;
    }
    SetPositionAngle(pos, a) {
        this.p.Copy(pos);
        this.q.SetAngle(a);
        return this;
    }
    SetPosition(position) {
        this.p.Copy(position);
        return this;
    }
    SetPositionXY(x, y) {
        this.p.Set(x, y);
        return this;
    }
    SetRotation(rotation) {
        this.q.Copy(rotation);
        return this;
    }
    SetRotationAngle(radians) {
        this.q.SetAngle(radians);
        return this;
    }
    GetPosition() {
        return this.p;
    }
    GetRotation() {
        return this.q;
    }
    GetRotationAngle() {
        return this.q.GetAngle();
    }
    GetAngle() {
        return this.q.GetAngle();
    }
    static MulXV(T, v, out) {
        // float32 x = (T.q.c * v.x - T.q.s * v.y) + T.p.x;
        // float32 y = (T.q.s * v.x + T.q.c * v.y) + T.p.y;
        // return b2Vec2(x, y);
        const T_q_c = T.q.c, T_q_s = T.q.s;
        const v_x = v.x, v_y = v.y;
        out.x = (T_q_c * v_x - T_q_s * v_y) + T.p.x;
        out.y = (T_q_s * v_x + T_q_c * v_y) + T.p.y;
        return out;
    }
    static MulTXV(T, v, out) {
        // float32 px = v.x - T.p.x;
        // float32 py = v.y - T.p.y;
        // float32 x = (T.q.c * px + T.q.s * py);
        // float32 y = (-T.q.s * px + T.q.c * py);
        // return b2Vec2(x, y);
        const T_q_c = T.q.c, T_q_s = T.q.s;
        const p_x = v.x - T.p.x;
        const p_y = v.y - T.p.y;
        out.x = (T_q_c * p_x + T_q_s * p_y);
        out.y = (-T_q_s * p_x + T_q_c * p_y);
        return out;
    }
    static MulXX(A, B, out) {
        b2Rot.MulRR(A.q, B.q, out.q);
        b2Vec2.AddVV(b2Rot.MulRV(A.q, B.p, out.p), A.p, out.p);
        return out;
    }
    static MulTXX(A, B, out) {
        b2Rot.MulTRR(A.q, B.q, out.q);
        b2Rot.MulTRV(A.q, b2Vec2.SubVV(B.p, A.p, out.p), out.p);
        return out;
    }
}
/// This describes the motion of a body/shape for TOI computation.
/// Shapes are defined with respect to the body origin, which may
/// no coincide with the center of mass. However, to support dynamics
/// we must interpolate the center of mass position.
export class b2Sweep {
    localCenter = new b2Vec2();
    c0 = new b2Vec2();
    c = new b2Vec2();
    a0 = 0;
    a = 0;
    alpha0 = 0;
    Clone() {
        return new b2Sweep().Copy(this);
    }
    Copy(other) {
        this.localCenter.Copy(other.localCenter);
        this.c0.Copy(other.c0);
        this.c.Copy(other.c);
        this.a0 = other.a0;
        this.a = other.a;
        this.alpha0 = other.alpha0;
        return this;
    }
    // https://fgiesen.wordpress.com/2012/08/15/linear-interpolation-past-present-and-future/
    GetTransform(xf, beta) {
        xf.p.x = (1.0 - beta) * this.c0.x + beta * this.c.x;
        xf.p.y = (1.0 - beta) * this.c0.y + beta * this.c.y;
        const angle = (1.0 - beta) * this.a0 + beta * this.a;
        xf.q.SetAngle(angle);
        xf.p.SelfSub(b2Rot.MulRV(xf.q, this.localCenter, b2Vec2.s_t0));
        return xf;
    }
    Advance(alpha) {
        // DEBUG: b2Assert(this.alpha0 < 1);
        const beta = (alpha - this.alpha0) / (1 - this.alpha0);
        const one_minus_beta = (1 - beta);
        this.c0.x = one_minus_beta * this.c0.x + beta * this.c.x;
        this.c0.y = one_minus_beta * this.c0.y + beta * this.c.y;
        this.a0 = one_minus_beta * this.a0 + beta * this.a;
        this.alpha0 = alpha;
    }
    Normalize() {
        const d = b2_two_pi * Math.floor(this.a0 / b2_two_pi);
        this.a0 -= d;
        this.a -= d;
    }
}
