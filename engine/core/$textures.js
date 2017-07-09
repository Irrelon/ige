"use strict";

var appCore = require('irrelon-appcore');

appCore.module('$textures', function () {
	var IgeTextureStore = function () {
		this._store = {};
	};
	
	IgeTextureStore.prototype.add = function (name, texture) {
		this._store[name] = texture;
	};
	
	IgeTextureStore.prototype.addGroup = function (group) {
		var i;
		
		for (i in group) {
			if (group.hasOwnProperty(i)) {
				this.add(i, group[i]);
			}
		}
	};
	
	IgeTextureStore.prototype.remove = function (name) {
		var texture = this._store[name];
		
		if (texture) {
			texture.destroy();
			delete this._store[name];
		}
	}
	
	IgeTextureStore.prototype.removeGroup = function (group) {
		var i;
		
		for (i in group) {
			if (group.hasOwnProperty(i)) {
				this.remove(i);
			}
		}
	}
	
	IgeTextureStore.prototype.get = function (name) {
		var tex = this._store[name];
		if (!tex) {
			throw('Attempted to get texture that does not exist: ' + name);
		}
		
		return tex;
	};
	
	return new IgeTextureStore();
});