export class IgeRouter {
    constructor() {
        this._route = {};
        this.go = function (path) {
            let self = this, currentRoutePath, rootPathString, currentPathParts, newPathParts, tempPath, i;
            // Check for a route definition first
            if (!this._route[path]) {
                throw ('Attempt to navigate to undefined route: ' + path);
            }
            currentRoutePath = self._currentRoutePath;
            rootPathString = '';
            currentPathParts = currentRoutePath.split('.');
            newPathParts = path.split('.');
            // Check current path
            if (self._currentRoutePath) {
                // Remove duplicate beginning parts from arrays
                while (currentPathParts.length && newPathParts.length && currentPathParts[0] === newPathParts[0]) {
                    rootPathString += '.' + currentPathParts.shift();
                    newPathParts.shift();
                }
                // Inform routes that they are being destroyed
                if (currentPathParts.length) {
                    tempPath = rootPathString;
                    currentPathParts.reverse();
                    for (i = 0; i < currentPathParts.length; i++) {
                        self._routeRemove(currentPathParts[i]);
                    }
                }
            }
            // Now route to the new path
            if (newPathParts.length) {
                tempPath = rootPathString;
                for (i = 0; i < newPathParts.length; i++) {
                    self._routeAdd(newPathParts[i]);
                }
            }
        };
        this._routeAdd = function (path) {
            let self = this, definition, routeSteps, routeData, thisFullPath, queue;
            self._currentRoutePath += self._currentRoutePath ? '.' + path : path;
            thisFullPath = self._currentRoutePath;
            queue = this._routeQueue;
            queue.push(function (finished) {
                definition = self._route[thisFullPath];
                routeSteps = [];
                // Check for non-universal route (both client and server have different
                // definitions for the same route)
                if (definition.client && definition.server) {
                    if (self.isClient) {
                        definition = definition.client;
                    }
                    if (self.isServer) {
                        definition = definition.server;
                    }
                }
                if (!definition.controller) {
                    self.log('$ige.engine._routeAdd() encountered a route that has no controller specified: ' + thisFullPath, 'error');
                }
                routeData = {
                    controllerModule: appCore.module(definition.controller),
                    texturesModule: definition.textures ? appCore.module(definition.textures) : undefined,
                    sceneGraphModule: definition.sceneGraph ? appCore.module(definition.sceneGraph) : undefined
                };
                self.routeData(thisFullPath, routeData);
                if (definition.textures) {
                    routeSteps.push(function (finished) {
                        routeData.texturesModule.emit('loading');
                        appCore.run([definition.textures, function (textures) {
                                if (!self.$textures.texturesLoaded()) {
                                    self.$textures.on('texturesLoaded', function () {
                                        routeData.texturesModule.emit('loaded');
                                        finished(false);
                                    });
                                    return;
                                }
                                routeData.texturesModule.emit('loaded');
                                return finished(false);
                            }]);
                    });
                }
                routeSteps.push(function (finished) {
                    routeData.controllerModule.emit('loading');
                    appCore.run([definition.controller, function (Controller) {
                            const controller = new Controller();
                            self.routeData(thisFullPath).controllerModuleInstance = controller;
                            routeData.controllerModule.emit('loaded');
                            finished(false, controller);
                        }]);
                });
                if (definition.sceneGraph) {
                    routeSteps.push(function (controller, finished) {
                        appCore.module('$controller', function () {
                            return controller;
                        });
                        appCore
                            .module(definition.sceneGraph)
                            .$controller = controller;
                        routeData.sceneGraphModule.emit('loading');
                        appCore.run([definition.sceneGraph, function (sceneGraph) {
                                self.engine.addGraph(definition.sceneGraph);
                                routeData.sceneGraphModule.emit('loaded');
                                finished(false);
                            }]);
                    });
                }
                routeSteps.waterfall(function () {
                    if (routeData.texturesModule) {
                        routeData.texturesModule.emit('ready');
                    }
                    routeData.controllerModule.emit('ready');
                    if (routeData.sceneGraphModule) {
                        routeData.sceneGraphModule.emit('ready');
                    }
                    finished();
                });
            });
            queue.series(function () { }, true);
        };
        this._routeRemove = function (path) {
            let self = this, routeData, thisFullPath, definition, queue;
            thisFullPath = self._currentRoutePath;
            queue = this._routeQueue;
            queue.push(function (finished) {
                routeData = self.routeData(thisFullPath);
                definition = self._route[thisFullPath];
                if (!routeData) {
                    throw ('Attempting to routeRemove() a path that has no routeData: ' + thisFullPath);
                }
                if (routeData.sceneGraphModule) {
                    routeData.sceneGraphModule.emit('destroying');
                    self.engine.removeGraph(definition.sceneGraph);
                }
                if (routeData.texturesModule) {
                    routeData.texturesModule.emit('destroying');
                }
                routeData.controllerModule.emit('destroying');
                if (routeData.sceneGraphModule) {
                    routeData.sceneGraphModule.emit('destroyed');
                }
                if (routeData.texturesModule) {
                    routeData.texturesModule.emit('destroyed');
                }
                routeData.controllerModule.emit('destroyed');
                self._currentRoutePath = self._currentRoutePath.replace(new RegExp('[\.]*?' + path + '$'), '');
                finished();
            });
            queue.series(function () { }, true);
        };
    }
    route(path, definition) {
        if (path !== undefined) {
            if (definition !== undefined) {
                this._route = this._route || {};
                this._route[path] = definition;
                return this;
            }
            return this._route[path];
        }
        return this._route;
    }
    routeData(path, data) {
        if (path !== undefined) {
            this._routeData = this._routeData || {};
            if (data !== undefined) {
                this._routeData[path] = data;
                return this;
            }
            return this._routeData[path];
        }
        return this._routeData;
    }
}
