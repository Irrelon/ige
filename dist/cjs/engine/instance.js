"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ige = void 0;
/**
 * In this file we instantiate the IGE instance that all other classes and code will
 * talk to when dealing with the engine. At first, when coding version 2.x of the engine
 * I was passing the ige instance into every class as a constructor argument, but it got
 * mega tedious very quickly and I realised that I was adding a ton of complexity and
 * code in order to support a highly edge-case scenario where you might want more than
 * one engine instance to operate on at a time.
 */
const Ige_1 = require("./core/Ige.js");
exports.ige = new Ige_1.Ige();
