"use strict";

var appCore = require('irrelon-appcore');

appCore.module('$textures', function () {
	var $textures = function () {
		this._store = {};
		this._arr = [];
		this._textureImageStore = {};
		this._texturesLoading = 0; // Holds a count of currently loading textures
		this._texturesTotal = 0; // Holds total number of textures loading / loaded
		this._globalSmoothing = false; // Determines the default smoothing setting for new textures
	};
	
	$textures.prototype.add = function (name, texture) {
		this._store[name] = texture;
	};
	
	$textures.prototype.addGroup = function (group) {
		var i;
		
		for (i in group) {
			if (group.hasOwnProperty(i)) {
				this.add(i, group[i]);
			}
		}
	};
	
	$textures.prototype.remove = function (name) {
		var texture = this._store[name];
		
		if (texture) {
			texture.destroy();
			delete this._store[name];
		}
	};
	
	$textures.prototype.removeGroup = function (group) {
		var i;
		
		for (i in group) {
			if (group.hasOwnProperty(i)) {
				this.remove(i);
			}
		}
	};
	
	$textures.prototype.get = function (name) {
		var tex = this._store[name];
		if (!tex) {
			throw('Attempted to get texture that does not exist: ' + name);
		}
		
		return tex;
	};
	
	/**
	 * Adds one to the number of textures currently loading.
	 */
	$textures.prototype.textureLoadStart = function (url, textureObj) {
		this._texturesLoading++;
		this._texturesTotal++;
		
		this.updateProgress();
		
		this.emit('textureLoadStart', textureObj);
	};
	
	/**
	 * Subtracts one from the number of textures currently loading and if no more need
	 * to load, it will also call the _allTexturesLoaded() method.
	 */
	$textures.prototype.textureLoadEnd = function (url, textureObj) {
		var self = this;
		
		if (!textureObj._destroyed) {
			// Add the texture to the _arr array
			this._arr.push(textureObj);
		}
		
		// Decrement the overall loading number
		this._texturesLoading--;
		
		this.updateProgress();
		
		this.emit('textureLoadEnd', textureObj);
		
		// If we've finished...
		if (this._texturesLoading === 0) {
			// All textures have finished loading
			this.updateProgress();
			
			setTimeout(function () {
				self._allTexturesLoaded();
			}, 100);
		}
	};
	
	/**
	 * Returns a texture from the texture store by it's url.
	 * @param {String} url
	 * @return {IgeTexture}
	 */
	$textures.prototype.textureFromUrl = function (url) {
		var arr = this._arr,
			arrCount = arr.length,
			item;
		
		while (arrCount--) {
			item = arr[arrCount];
			if (item._url === url) {
				return item;
			}
		}
	};
	
	/**
	 * Checks if all textures have finished loading and returns true if so.
	 * @return {Boolean}
	 */
	$textures.prototype.texturesLoaded = function () {
		return this._texturesLoading === 0;
	};
	
	/**
	 * Emits the "texturesLoaded" event.
	 * @private
	 */
	$textures.prototype._allTexturesLoaded = function () {
		if (!this._loggedATL) {
			this._loggedATL = true;
			this.log('All textures have loaded');
		}
		
		// Fire off an event about this
		this.emit('texturesLoaded');
	};
	
	/**
	 * Gets / sets the default smoothing value for all new
	 * IgeTexture class instances. If set to true, all newly
	 * created textures will have smoothing enabled by default.
	 * @param val
	 * @return {*}
	 */
	$textures.prototype.globalSmoothing = function (val) {
		if (val !== undefined) {
			this._globalSmoothing = val;
			return this;
		}
		
		return this._globalSmoothing;
	};
	
	return new $textures();
});