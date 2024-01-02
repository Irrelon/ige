"use strict";
/// <reference lib="webworker" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClient = exports.isServer = exports.isWorker = void 0;
exports.isWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
exports.isServer = typeof window === "undefined" && !exports.isWorker;
exports.isClient = !exports.isServer;
