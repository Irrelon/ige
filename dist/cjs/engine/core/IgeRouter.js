"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeRouter = void 0;
const exports_1 = require("../../export/exports.js");
const PATH_DELIMITER = "/";
class IgeRouter extends exports_1.IgeBaseClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeRouter";
        this._routeLoad = {};
        this._routeUnload = {};
        this._currentRoutePath = "";
        this._routeQueue = [];
        this._executingSeries = false;
    }
    route(path, definition) {
        if (path !== undefined) {
            if (definition !== undefined) {
                this._routeLoad = this._routeLoad || {};
                this._routeLoad[path] = definition;
                return this;
            }
            return this._routeLoad[path];
        }
        return this._routeLoad;
    }
    /**
     * Navigate to a given path and execute the corresponding route handler(s).
     *
     * @param {string} path The path to navigate to.
     * @param {...any} args Additional arguments to pass to the route handler(s).
     * @throws {Error} If the route defined for the given path does not exist.
     */
    go(path, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check for a route definition first
            if (!this._routeLoad[path]) {
                throw new Error("Attempt to navigate to undefined route: " + path);
            }
            if (path === this._currentRoutePath)
                return;
            this.log(`Router navigating to: ${path}`);
            const currentRoutePath = this._currentRoutePath;
            const currentPathParts = currentRoutePath.split(PATH_DELIMITER);
            const newPathParts = path.split(PATH_DELIMITER);
            const commonPathParts = [];
            // Remove the common path parts from both arrays
            while (currentPathParts.length && newPathParts.length && currentPathParts[0] === newPathParts[0]) {
                const part = currentPathParts.shift();
                newPathParts.shift();
                if (!part)
                    continue;
                commonPathParts.push(part);
            }
            const rootPath = commonPathParts.join(PATH_DELIMITER);
            if (currentRoutePath) {
                // Word backwards and call the unload function for each existing path
                while (currentPathParts.length) {
                    const unloadRoutePath = this._pathJoin(rootPath, currentPathParts.join(PATH_DELIMITER));
                    this.logIndent();
                    this.log(`Unloading route: "${unloadRoutePath}"`);
                    this.logIndent();
                    const routeUnloadHandler = this._routeUnload[unloadRoutePath];
                    if (routeUnloadHandler) {
                        yield routeUnloadHandler(...args);
                    }
                    this.logOutdent();
                    this.logOutdent();
                    currentPathParts.pop();
                }
            }
            // Now work forwards on the new path parts and mount each route
            // handler
            const newPartsAggregate = [];
            for (let i = 0; i < newPathParts.length; i++) {
                newPartsAggregate.push(newPathParts[i]);
                const loadRoutePath = this._pathJoin(rootPath, newPartsAggregate.join(PATH_DELIMITER));
                const routeHandlerDefinition = this._routeLoad[loadRoutePath];
                if (!routeHandlerDefinition) {
                    continue;
                }
                let routeHandlerFunction;
                if (exports_1.isClient && routeHandlerDefinition.client) {
                    routeHandlerFunction = routeHandlerDefinition.client;
                }
                if (exports_1.isServer && routeHandlerDefinition.server) {
                    routeHandlerFunction = routeHandlerDefinition.server;
                }
                if (routeHandlerFunction) {
                    this.logIndent();
                    this.log(`Loading route: "${loadRoutePath}"`);
                    this.logIndent();
                    this._routeUnload[loadRoutePath] = yield routeHandlerFunction(...args);
                    this.logOutdent();
                    this.logOutdent();
                }
            }
            this._currentRoutePath = path;
        });
    }
    _pathJoin(path1, path2) {
        if (!path1 && !path2)
            return "";
        if (path1 && !path2)
            return path1;
        if (path2 && !path1)
            return path2;
        return path1 + PATH_DELIMITER + path2;
    }
    _routeAdd(path) {
    }
    _routeRemove(path) {
    }
    _processQueue() {
    }
}
exports.IgeRouter = IgeRouter;
