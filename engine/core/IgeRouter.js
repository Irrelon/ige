var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { isClient, isServer } from "../services/clientServer.js";
import IgeBaseClass from "./IgeBaseClass.js";
const PATH_DELIMITER = "/";
export class IgeRouter extends IgeBaseClass {
    constructor() {
        super(...arguments);
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
    go(path) {
        // Check for a route definition first
        if (!this._routeLoad[path]) {
            throw ('Attempt to navigate to undefined route: ' + path);
        }
        const currentRoutePath = this._currentRoutePath;
        const currentPathParts = currentRoutePath.split(PATH_DELIMITER);
        const newPathParts = path.split(PATH_DELIMITER);
        // TODO This is commented because not used. Find out if needed.
        //let rootPathString = '';
        // Check current path
        if (this._currentRoutePath) {
            // Remove duplicate beginning parts from arrays
            while (currentPathParts.length && newPathParts.length && currentPathParts[0] === newPathParts[0]) {
                //rootPathString += PATH_DELIMITER + currentPathParts.shift();
                newPathParts.shift();
            }
            // Inform routes that they are being destroyed
            if (currentPathParts.length) {
                currentPathParts.reverse();
                for (let i = 0; i < currentPathParts.length; i++) {
                    this._routeRemove(currentPathParts[i]);
                }
            }
        }
        // Now route to the new path
        if (newPathParts.length) {
            for (let i = 0; i < newPathParts.length; i++) {
                this._routeAdd(newPathParts[i]);
            }
        }
    }
    _routeAdd(path) {
        this._currentRoutePath += this._currentRoutePath ? PATH_DELIMITER + path : path;
        const thisFullPath = this._currentRoutePath;
        const queue = this._routeQueue;
        queue.push(() => __awaiter(this, void 0, void 0, function* () {
            const routeDefinition = this._routeLoad[thisFullPath];
            let routeHandlerFunction;
            // Check for client or server specific route definitions
            if (isClient && routeDefinition.client) {
                routeHandlerFunction = routeDefinition.client;
            }
            if (isServer && routeDefinition.server) {
                routeHandlerFunction = routeDefinition.server;
            }
            if (!routeHandlerFunction) {
                throw new Error(`$ige.engine._routeAdd() encountered a route that has no function specified: ${thisFullPath}`);
            }
            // Execute the route function which will return an unload function
            this._routeUnload[path] = yield routeHandlerFunction();
        }));
        this._processQueue();
    }
    _routeRemove(path) {
        const thisFullPath = this._currentRoutePath;
        const queue = this._routeQueue;
        queue.push(() => __awaiter(this, void 0, void 0, function* () {
            const unloadFunction = this._routeUnload[thisFullPath];
            if (!unloadFunction) {
                throw ('Attempting to routeRemove() a path that has no route unload function: ' + thisFullPath);
            }
            yield unloadFunction();
            this._currentRoutePath = this._currentRoutePath.replace(new RegExp('[\.]*?' + path + '$'), '');
        }));
        this._processQueue();
    }
    _processQueue() {
        if (this._executingSeries) {
            // We're already processing the array
            return;
        }
        const callArr = this._routeQueue;
        if (!callArr.length) {
            this._executingSeries = false;
            return;
        }
        this._executingSeries = true;
        const nextItem = () => __awaiter(this, void 0, void 0, function* () {
            // Grab the first function from the array and remove it from the array
            const func = callArr.shift();
            if (!func) {
                this._executingSeries = false;
                return;
            }
            // Execute the function
            yield func();
            // Process the next item
            yield nextItem();
        });
        void nextItem();
    }
}
