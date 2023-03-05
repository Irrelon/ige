"use strict";

var appCore = require('irrelon-appcore');

appCore.module('$ige', function () {
	var $ige = function () {
		// Determine the environment we are executing in
		this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined' && typeof window === 'undefined');
		this.isClient = !this.isServer;
		
		this._currentViewport = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
		this._currentCamera = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
		this._currentRoutePath = '';
		this._routeQueue = [];
		this._route = {};
	};
	
	/**
	 * Creates a new instance of the component argument passing
	 * the options argument to the component as it is initialised.
	 * The new component instance is then added to "this" via
	 * a property name that is defined in the component class as
	 * "componentId".
	 * @param {Function} component The class definition of the component.
	 * @param {Object=} options An options parameter to pass to the component
	 * on init.
	 * @example #Add the velocity component to an entity
	 *     var entity = new IgeEntity();
	 *     entity.addComponent(IgeVelocityComponent);
	 *
	 *     // Now that the component is added, we can access
	 *     // the component via it's namespace. Call the
	 *     // "byAngleAndPower" method of the velocity component:
	 *     entity.velocity.byAngleAndPower(Math.radians(20), 0.1);
	 */
	$ige.prototype.addComponent = function (component, options) {
		var newComponent = new component(this, options);
		this[newComponent.componentId] = newComponent;
		
		// Add the component reference to the class component array
		this._components = this._components || [];
		this._components.push(newComponent);
		
		return this;
	};
	
	/**
	 * Gets / sets a route for the engine routing system.
	 * @param {String=} path The path for the route being get or set.
	 * @param {Object=} definition The definition to set to the
	 * specified path. If not passed, returns the current definition
	 * for the path.
	 * @returns {*}
	 */
	$ige.prototype.route = function (path, definition) {
		if (path !== undefined) {
			if (definition !== undefined) {
				this._route = this._route || {};
				this._route[path] = definition;
				
				return this;
			}
			
			return this._route[path];
		}
		
		return this._route;
	};
	
	/**
	 * Gets / sets route data by path.
	 * @param {String} path The path to get / set data for.
	 * @param {*=} data The data to set for the path.
	 * @returns {*}
	 */
	$ige.prototype.routeData = function (path, data) {
		if (path !== undefined) {
			this._routeData = this._routeData || {};
			
			if (data !== undefined) {
				this._routeData[path] = data;
				return this;
			}
			
			return this._routeData[path];
		}
		
		return this._routeData;
	};
	
	/**
	 * Tells the engine to navigate to the passed path. The current
	 * path will be exited before the new path is navigated to.
	 * @param {String} path The new path to navigate to.
	 */
	$ige.prototype.go = function (path) {
		var self = this,
			currentRoutePath,
			rootPathString,
			currentPathParts,
			newPathParts,
			tempPath,
			i;
		
		// Check for a route definition first
		if (!this._route[path]) {
			throw('Attempt to navigate to undefined route: ' + path);
		}
		
		currentRoutePath = self._currentRoutePath;
		rootPathString = '';
		currentPathParts = currentRoutePath.split('.');
		newPathParts = path.split('.');
		
		// Check current path
		if (self._currentRoutePath) {
			// Remove duplicate beginning parts from arrays
			while(currentPathParts.length && newPathParts.length && currentPathParts[0] === newPathParts[0]) {
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
	
	/**
	 * Adds a path section to the current path and executes the
	 * various parts of the path definition such as the designated
	 * scene graph, textures and controller.
	 * @param {String} path The path section to navigate to.
	 * @private
	 */
	$ige.prototype._routeAdd = function (path) {
		var self = this,
			definition,
			routeSteps,
			routeData,
			thisFullPath,
			queue;
		
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
					var controller = new Controller();
					
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
				if (routeData.texturesModule) { routeData.texturesModule.emit('ready'); }
				routeData.controllerModule.emit('ready');
				if (routeData.sceneGraphModule) { routeData.sceneGraphModule.emit('ready'); }
				
				finished();
			});
		});
		
		queue.series(function () {}, true);
	};
	
	/**
	 * Removes a path section from the current path and fires the
	 * "destroying" and finally "destroyed" events for any textures,
	 * scene graph and controller.
	 * @param {String} path The path section to navigate from.
	 * @private
	 */
	$ige.prototype._routeRemove = function (path) {
		var self = this,
			routeData,
			thisFullPath,
			definition,
			queue;
		
		thisFullPath = self._currentRoutePath;
		queue = this._routeQueue;
		
		queue.push(function (finished) {
			routeData = self.routeData(thisFullPath);
			definition = self._route[thisFullPath];
			
			if (!routeData) {
				throw('Attempting to routeRemove() a path that has no routeData: ' + thisFullPath);
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
		
		queue.series(function () {}, true);
	}
	
	return new $ige();
});