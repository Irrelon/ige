"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easingFunctions = exports.outInBounce = exports.inOutBounce = exports.outBounce = exports.inBounce = exports.outInBack = exports.inOutBack = exports.outBack = exports.inBack = exports.outInElastic = exports.inOutElastic = exports.outElastic = exports.inElastic = exports.outInCirc = exports.inOutCirc = exports.outCirc = exports.inCirc = exports.outInExpo = exports.inOutExpo = exports.outExpo = exports.inExpo = exports.outInSine = exports.inOutSine = exports.outSine = exports.inSine = exports.outInQuint = exports.inOutQuint = exports.outQuint = exports.inQuint = exports.outInQuart = exports.inOutQuart = exports.outQuart = exports.inQuart = exports.outInCubic = exports.inOutCubic = exports.outCubic = exports.inCubic = exports.inOutQuad = exports.outQuad = exports.inQuad = exports.none = void 0;
// Easing equations converted from AS to JS from original source at
// http://robertpenner.com/easing/
// I believe that t = time or progression, c = start value, d = delta between
// start time and current time - Rob (Irrelon)
const none = (t, c, d) => {
    return c * t / d;
};
exports.none = none;
const inQuad = (t, c, d) => {
    return c * (t /= d) * t;
};
exports.inQuad = inQuad;
const outQuad = (t, c, d) => {
    return -c * (t /= d) * (t - 2);
};
exports.outQuad = outQuad;
const inOutQuad = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return c / 2 * t * t;
    }
    return -c / 2 * ((--t) * (t - 2) - 1);
};
exports.inOutQuad = inOutQuad;
const inCubic = (t, c, d) => {
    return c * (t /= d) * t * t;
};
exports.inCubic = inCubic;
const outCubic = (t, c, d) => {
    return c * ((t = t / d - 1) * t * t + 1);
};
exports.outCubic = outCubic;
const inOutCubic = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return c / 2 * t * t * t;
    }
    return c / 2 * ((t -= 2) * t * t + 2);
};
exports.inOutCubic = inOutCubic;
const outInCubic = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.outCubic)(t * 2, c / 2, d);
    }
    return (0, exports.inCubic)((t * 2) - d, c / 2, c / 2);
};
exports.outInCubic = outInCubic;
const inQuart = (t, c, d) => {
    return c * (t /= d) * t * t * t;
};
exports.inQuart = inQuart;
const outQuart = (t, c, d) => {
    return -c * ((t = t / d - 1) * t * t * t - 1);
};
exports.outQuart = outQuart;
const inOutQuart = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return c / 2 * t * t * t * t;
    }
    return -c / 2 * ((t -= 2) * t * t * t - 2);
};
exports.inOutQuart = inOutQuart;
const outInQuart = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.outQuart)(t * 2, c / 2, d);
    }
    return (0, exports.inQuart)((t * 2) - d, c / 2, c / 2);
};
exports.outInQuart = outInQuart;
const inQuint = (t, c, d) => {
    return c * (t /= d) * t * t * t * t;
};
exports.inQuint = inQuint;
const outQuint = (t, c, d) => {
    return c * ((t = t / d - 1) * t * t * t * t + 1);
};
exports.outQuint = outQuint;
const inOutQuint = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return c / 2 * t * t * t * t * t;
    }
    return c / 2 * ((t -= 2) * t * t * t * t + 2);
};
exports.inOutQuint = inOutQuint;
const outInQuint = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.outQuint)(t * 2, c / 2, d);
    }
    return (0, exports.inQuint)((t * 2) - d, c / 2, c / 2);
};
exports.outInQuint = outInQuint;
const inSine = (t, c, d) => {
    return -c * Math.cos(t / d * (Math.PI / 2)) + c;
};
exports.inSine = inSine;
const outSine = (t, c, d) => {
    return c * Math.sin(t / d * (Math.PI / 2));
};
exports.outSine = outSine;
const inOutSine = (t, c, d) => {
    return -c / 2 * (Math.cos(Math.PI * t / d) - 1);
};
exports.inOutSine = inOutSine;
const outInSine = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.outSine)(t * 2, c / 2, d);
    }
    return (0, exports.inSine)((t * 2) - d, c / 2, c / 2);
};
exports.outInSine = outInSine;
const inExpo = (t, c, d) => {
    return (t === 0) ? 0 : c * Math.pow(2, 10 * (t / d - 1)) - c * 0.001;
};
exports.inExpo = inExpo;
const outExpo = (t, c, d) => {
    return (t === d) ? c : c * 1.001 * (-Math.pow(2, -10 * t / d) + 1);
};
exports.outExpo = outExpo;
const inOutExpo = (t, c, d) => {
    if (t === 0) {
        return 0;
    }
    if (t === d) {
        return c;
    }
    if ((t /= d / 2) < 1) {
        return c / 2 * Math.pow(2, 10 * (t - 1)) - c * 0.0005;
    }
    return c / 2 * 1.0005 * (-Math.pow(2, -10 * --t) + 2);
};
exports.inOutExpo = inOutExpo;
const outInExpo = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.outExpo)(t * 2, c / 2, d);
    }
    return (0, exports.inExpo)((t * 2) - d, c / 2, c / 2);
};
exports.outInExpo = outInExpo;
const inCirc = (t, c, d) => {
    return -c * (Math.sqrt(1 - (t /= d) * t) - 1);
};
exports.inCirc = inCirc;
const outCirc = (t, c, d) => {
    return c * Math.sqrt(1 - (t = t / d - 1) * t);
};
exports.outCirc = outCirc;
const inOutCirc = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return -c / 2 * (Math.sqrt(1 - t * t) - 1);
    }
    return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
};
exports.inOutCirc = inOutCirc;
const outInCirc = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.outCirc)(t * 2, c / 2, d);
    }
    return (0, exports.inCirc)((t * 2) - d, c / 2, c / 2);
};
exports.outInCirc = outInCirc;
const inElastic = (t, c, d, a, p) => {
    let s;
    if (t === 0) {
        return 0;
    }
    if ((t /= d) === 1) {
        return c;
    }
    if (!p) {
        p = d * 0.3;
    }
    if (!a || a < Math.abs(c)) {
        a = c;
        s = p / 4;
    }
    else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
    }
    return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p));
};
exports.inElastic = inElastic;
const outElastic = (t, c, d, a, p) => {
    let s;
    if (t === 0) {
        return 0;
    }
    if ((t /= d) === 1) {
        return c;
    }
    if (!p) {
        p = d * 0.3;
    }
    if (!a || a < Math.abs(c)) {
        a = c;
        s = p / 4;
    }
    else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
    }
    return (a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c);
};
exports.outElastic = outElastic;
const inOutElastic = (t, c, d, a, p) => {
    let s;
    if (t === 0) {
        return 0;
    }
    if ((t /= d / 2) === 2) {
        return c;
    }
    if (!p) {
        p = d * (0.3 * 1.5);
    }
    if (!a || a < Math.abs(c)) {
        a = c;
        s = p / 4;
    }
    else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
    }
    if (t < 1) {
        return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p));
    }
    return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * 0.5 + c;
};
exports.inOutElastic = inOutElastic;
const outInElastic = (t, c, d, a, p) => {
    if (t < d / 2) {
        return (0, exports.outElastic)(t * 2, c / 2, d, a, p);
    }
    return (0, exports.inElastic)((t * 2) - d, c / 2, c / 2, d, a);
};
exports.outInElastic = outInElastic;
const inBack = (t, c, d, s) => {
    if (s === undefined) {
        s = 1.70158;
    }
    return c * (t /= d) * t * ((s + 1) * t - s);
};
exports.inBack = inBack;
const outBack = (t, c, d, s) => {
    if (s === undefined) {
        s = 1.70158;
    }
    return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1);
};
exports.outBack = outBack;
const inOutBack = (t, c, d, s) => {
    if (s === undefined) {
        s = 1.70158;
    }
    if ((t /= d / 2) < 1) {
        return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s));
    }
    return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
};
exports.inOutBack = inOutBack;
const outInBack = (t, c, d, s) => {
    if (t < d / 2) {
        return (0, exports.outBack)(t * 2, c / 2, d, s);
    }
    return (0, exports.inBack)((t * 2) - d, c / 2, c / 2, d);
};
exports.outInBack = outInBack;
const inBounce = (t, c, d) => {
    return c - (0, exports.outBounce)(d - t, 0, c);
};
exports.inBounce = inBounce;
const outBounce = (t, c, d) => {
    if ((t /= d) < (1 / 2.75)) {
        return c * (7.5625 * t * t);
    }
    else if (t < (2 / 2.75)) {
        return c * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75);
    }
    else if (t < (2.5 / 2.75)) {
        return c * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375);
    }
    else {
        return c * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375);
    }
};
exports.outBounce = outBounce;
const inOutBounce = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.inBounce)(t * 2, 0, c) * 0.5;
    }
    else {
        return (0, exports.outBounce)(t * 2 - d, 0, c) * 0.5 + c * 0.5;
    }
};
exports.inOutBounce = inOutBounce;
const outInBounce = (t, c, d) => {
    if (t < d / 2) {
        return (0, exports.outBounce)(t * 2, c / 2, d);
    }
    return (0, exports.inBounce)((t * 2) - d, c / 2, c / 2);
};
exports.outInBounce = outInBounce;
exports.easingFunctions = {
    none: exports.none,
    inQuad: exports.inQuad,
    outQuad: exports.outQuad,
    inOutQuad: exports.inOutQuad,
    inCubic: exports.inCubic,
    outCubic: exports.outCubic,
    inOutCubic: exports.inOutCubic,
    outInCubic: exports.outInCubic,
    inQuart: exports.inQuart,
    outQuart: exports.outQuart,
    inOutQuart: exports.inOutQuart,
    outInQuart: exports.outInQuart,
    inQuint: exports.inQuint,
    outQuint: exports.outQuint,
    inOutQuint: exports.inOutQuint,
    outInQuint: exports.outInQuint,
    inSine: exports.inSine,
    outSine: exports.outSine,
    inOutSine: exports.inOutSine,
    outInSine: exports.outInSine,
    inExpo: exports.inExpo,
    outExpo: exports.outExpo,
    inOutExpo: exports.inOutExpo,
    outInExpo: exports.outInExpo,
    inCirc: exports.inCirc,
    outCirc: exports.outCirc,
    inOutCirc: exports.inOutCirc,
    outInCirc: exports.outInCirc,
    inElastic: exports.inElastic,
    outElastic: exports.outElastic,
    inOutElastic: exports.inOutElastic,
    outInElastic: exports.outInElastic,
    inBack: exports.inBack,
    outBack: exports.outBack,
    inOutBack: exports.inOutBack,
    outInBack: exports.outInBack,
    inBounce: exports.inBounce,
    outBounce: exports.outBounce,
    inOutBounce: exports.inOutBounce,
    outInBounce: exports.outInBounce
};
