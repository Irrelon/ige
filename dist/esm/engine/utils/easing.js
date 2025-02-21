// Easing equations converted from AS to JS from original source at
// http://robertpenner.com/easing/
// I believe that t = time or progression, c = start value, d = delta between
// start time and current time - Rob (Irrelon)
export const none = (t, c, d) => {
    return (c * t) / d;
};
export const inQuad = (t, c, d) => {
    return c * (t /= d) * t;
};
export const outQuad = (t, c, d) => {
    return -c * (t /= d) * (t - 2);
};
export const inOutQuad = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return (c / 2) * t * t;
    }
    return (-c / 2) * (--t * (t - 2) - 1);
};
export const inCubic = (t, c, d) => {
    return c * (t /= d) * t * t;
};
export const outCubic = (t, c, d) => {
    return c * ((t = t / d - 1) * t * t + 1);
};
export const inOutCubic = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return (c / 2) * t * t * t;
    }
    return (c / 2) * ((t -= 2) * t * t + 2);
};
export const outInCubic = (t, c, d) => {
    if (t < d / 2) {
        return outCubic(t * 2, c / 2, d);
    }
    return inCubic(t * 2 - d, c / 2, c / 2);
};
export const inQuart = (t, c, d) => {
    return c * (t /= d) * t * t * t;
};
export const outQuart = (t, c, d) => {
    return -c * ((t = t / d - 1) * t * t * t - 1);
};
export const inOutQuart = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return (c / 2) * t * t * t * t;
    }
    return (-c / 2) * ((t -= 2) * t * t * t - 2);
};
export const outInQuart = (t, c, d) => {
    if (t < d / 2) {
        return outQuart(t * 2, c / 2, d);
    }
    return inQuart(t * 2 - d, c / 2, c / 2);
};
export const inQuint = (t, c, d) => {
    return c * (t /= d) * t * t * t * t;
};
export const outQuint = (t, c, d) => {
    return c * ((t = t / d - 1) * t * t * t * t + 1);
};
export const inOutQuint = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return (c / 2) * t * t * t * t * t;
    }
    return (c / 2) * ((t -= 2) * t * t * t * t + 2);
};
export const outInQuint = (t, c, d) => {
    if (t < d / 2) {
        return outQuint(t * 2, c / 2, d);
    }
    return inQuint(t * 2 - d, c / 2, c / 2);
};
export const inSine = (t, c, d) => {
    return -c * Math.cos((t / d) * (Math.PI / 2)) + c;
};
export const outSine = (t, c, d) => {
    return c * Math.sin((t / d) * (Math.PI / 2));
};
export const inOutSine = (t, c, d) => {
    return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1);
};
export const outInSine = (t, c, d) => {
    if (t < d / 2) {
        return outSine(t * 2, c / 2, d);
    }
    return inSine(t * 2 - d, c / 2, c / 2);
};
export const inExpo = (t, c, d) => {
    return t === 0 ? 0 : c * Math.pow(2, 10 * (t / d - 1)) - c * 0.001;
};
export const outExpo = (t, c, d) => {
    return t === d ? c : c * 1.001 * (-Math.pow(2, (-10 * t) / d) + 1);
};
export const inOutExpo = (t, c, d) => {
    if (t === 0) {
        return 0;
    }
    if (t === d) {
        return c;
    }
    if ((t /= d / 2) < 1) {
        return (c / 2) * Math.pow(2, 10 * (t - 1)) - c * 0.0005;
    }
    return (c / 2) * 1.0005 * (-Math.pow(2, -10 * --t) + 2);
};
export const outInExpo = (t, c, d) => {
    if (t < d / 2) {
        return outExpo(t * 2, c / 2, d);
    }
    return inExpo(t * 2 - d, c / 2, c / 2);
};
export const inCirc = (t, c, d) => {
    return -c * (Math.sqrt(1 - (t /= d) * t) - 1);
};
export const outCirc = (t, c, d) => {
    return c * Math.sqrt(1 - (t = t / d - 1) * t);
};
export const inOutCirc = (t, c, d) => {
    if ((t /= d / 2) < 1) {
        return (-c / 2) * (Math.sqrt(1 - t * t) - 1);
    }
    return (c / 2) * (Math.sqrt(1 - (t -= 2) * t) + 1);
};
export const outInCirc = (t, c, d) => {
    if (t < d / 2) {
        return outCirc(t * 2, c / 2, d);
    }
    return inCirc(t * 2 - d, c / 2, c / 2);
};
export const inElastic = (t, c, d, a, p) => {
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
        s = (p / (2 * Math.PI)) * Math.asin(c / a);
    }
    return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t * d - s) * (2 * Math.PI)) / p));
};
export const outElastic = (t, c, d, a, p) => {
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
        s = (p / (2 * Math.PI)) * Math.asin(c / a);
    }
    return a * Math.pow(2, -10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) + c;
};
export const inOutElastic = (t, c, d, a, p) => {
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
        s = (p / (2 * Math.PI)) * Math.asin(c / a);
    }
    if (t < 1) {
        return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t * d - s) * (2 * Math.PI)) / p));
    }
    return a * Math.pow(2, -10 * (t -= 1)) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) * 0.5 + c;
};
export const outInElastic = (t, c, d, a, p) => {
    if (t < d / 2) {
        return outElastic(t * 2, c / 2, d, a, p);
    }
    return inElastic(t * 2 - d, c / 2, c / 2, d, a);
};
export const inBack = (t, c, d, s) => {
    if (s === undefined) {
        s = 1.70158;
    }
    return c * (t /= d) * t * ((s + 1) * t - s);
};
export const outBack = (t, c, d, s) => {
    if (s === undefined) {
        s = 1.70158;
    }
    return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1);
};
export const inOutBack = (t, c, d, s) => {
    if (s === undefined) {
        s = 1.70158;
    }
    if ((t /= d / 2) < 1) {
        return (c / 2) * (t * t * (((s *= 1.525) + 1) * t - s));
    }
    return (c / 2) * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2);
};
export const outInBack = (t, c, d, s) => {
    if (t < d / 2) {
        return outBack(t * 2, c / 2, d, s);
    }
    return inBack(t * 2 - d, c / 2, c / 2, d);
};
export const inBounce = (t, c, d) => {
    return c - outBounce(d - t, 0, c);
};
export const outBounce = (t, c, d) => {
    if ((t /= d) < 1 / 2.75) {
        return c * (7.5625 * t * t);
    }
    else if (t < 2 / 2.75) {
        return c * (7.5625 * (t -= 1.5 / 2.75) * t + 0.75);
    }
    else if (t < 2.5 / 2.75) {
        return c * (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375);
    }
    else {
        return c * (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375);
    }
};
export const inOutBounce = (t, c, d) => {
    if (t < d / 2) {
        return inBounce(t * 2, 0, c) * 0.5;
    }
    else {
        return outBounce(t * 2 - d, 0, c) * 0.5 + c * 0.5;
    }
};
export const outInBounce = (t, c, d) => {
    if (t < d / 2) {
        return outBounce(t * 2, c / 2, d);
    }
    return inBounce(t * 2 - d, c / 2, c / 2);
};
export const easingFunctions = {
    none,
    inQuad,
    outQuad,
    inOutQuad,
    inCubic,
    outCubic,
    inOutCubic,
    outInCubic,
    inQuart,
    outQuart,
    inOutQuart,
    outInQuart,
    inQuint,
    outQuint,
    inOutQuint,
    outInQuint,
    inSine,
    outSine,
    inOutSine,
    outInSine,
    inExpo,
    outExpo,
    inOutExpo,
    outInExpo,
    inCirc,
    outCirc,
    inOutCirc,
    outInCirc,
    inElastic,
    outElastic,
    inOutElastic,
    outInElastic,
    inBack,
    outBack,
    inOutBack,
    outInBack,
    inBounce,
    outBounce,
    inOutBounce,
    outInBounce
};
