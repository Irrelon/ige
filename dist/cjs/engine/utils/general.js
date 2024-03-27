"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElementPosition = exports.delay = exports.destroyAll = exports.theSameAs = void 0;
/**
 * Checks if the
 * property values of this object are equal to the property values
 * of the passed object. If they are the same then this method will
 * return true. Objects must not contain circular references!
 * @param {Object} obj1 The first object to compare to.
 * @param {Object} obj2 The other object to compare to.
 * @return {boolean}
 */
const theSameAs = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};
exports.theSameAs = theSameAs;
/**
 * Iterates through an array's items and calls each item's
 * destroy() method if it exists. Useful for destroying an
 * array of IgeEntity instances.
 */
const destroyAll = (arr) => {
    const arrCount = arr.length;
    for (let i = arrCount - 1; i >= 0; i--) {
        if (typeof arr[i].destroy === "function") {
            arr[i].destroy();
        }
    }
};
exports.destroyAll = destroyAll;
/**
 * Returns a promise that resolves in the given milliseconds.
 * @param ms
 */
const delay = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};
exports.delay = delay;
/**
 * Gets the bounding rectangle for the passed HTML element.
 * Uses DOM methods.
 */
const getElementPosition = (elem) => {
    if (!elem) {
        return {
            top: 0,
            left: 0
        };
    }
    try {
        return elem.getBoundingClientRect();
    }
    catch (e) {
        return {
            top: elem.offsetTop,
            left: elem.offsetLeft
        };
    }
};
exports.getElementPosition = getElementPosition;
