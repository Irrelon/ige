"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newIdHex = exports.newId = exports.newIdNumber = void 0;
let _idCounter = 0;
/**
 * Generates a new unique ID as a number.
 * @return {number}
 */
const newIdNumber = () => {
    _idCounter++;
    return (_idCounter +
        (Math.random() * Math.pow(10, 17) +
            Math.random() * Math.pow(10, 17) +
            Math.random() * Math.pow(10, 17) +
            Math.random() * Math.pow(10, 17)));
};
exports.newIdNumber = newIdNumber;
/**
 * Generates a new unique ID string
 * @return {string}
 */
const newId = () => {
    _idCounter++;
    return (0, exports.newIdNumber)().toString();
};
exports.newId = newId;
/**
 * Generates a new 16-character hexadecimal unique ID
 * @return {string}
 */
const newIdHex = () => {
    return (0, exports.newIdNumber)().toString(16);
};
exports.newIdHex = newIdHex;
