window.igeLoader = (function () {
	var IgeLoader = function () {
		var self = this,
			ccScript;

		this._loadingCount = 0;

		// Load the clientConfig.js file into browser memory
		ccScript = document.createElement('script');
		ccScript.src = igeRoot + 'CoreConfig.js';
		ccScript.onload = function () {
			self.coreConfigReady();
		};
		ccScript.addEventListener('error', function () {
			throw('ERROR LOADING ' + igeRoot + 'CoreConfig.js' + ' - does it exist?');
		}, true);

		document.getElementsByTagName('head')[0].appendChild(ccScript);
	};

	IgeLoader.prototype.coreConfigReady = function () {
		var self = this;

		if (typeof(igeCoreConfig) !== 'undefined') {
			// Load the client config
			ccScript = document.createElement('script');
			ccScript.src = './ClientConfig.js';
			ccScript.onload = function () {
				self.clientConfigReady();
			};
			ccScript.addEventListener('error', function () {
				throw('ERROR LOADING ClientConfig.js - does it exist?');
			}, true);

			document.getElementsByTagName('head')[0].appendChild(ccScript);
		} else {
			throw('ERROR READING igeCoreConfig object - was it specified in CoreConfig.js?');
		}
	};

	IgeLoader.prototype.clientConfigReady = function () {
		// Add the two array items into a single array
		this._coreList = igeCoreConfig.include;
		this._clientList = igeClientConfig.include;

		this._fileList = [];
		for (i = 0; i < this._coreList.length; i++) {
			// Check that the file should be loaded on the client
			if (this._coreList[i][0].indexOf('c') > -1) {
				this._fileList.push(igeRoot + this._coreList[i][2]);
			}
		}

		for (i = 0; i < this._clientList.length; i++) {
			this._fileList.push(this._clientList[i]);
		}

		this.loadNext();
	};

	IgeLoader.prototype.loadNext = function () {
		var url = this._fileList.shift(),
			script = document.createElement('script'),
			self = this;

		if (url !== undefined) {
			script.src = url;
			script.onload = function () {
				self.loadNext();
			};

			script.addEventListener('error', function () {
				throw('ERROR LOADING ' + url + ' - does it exist?');
			}, true);

			document.getElementsByTagName('head')[0].appendChild(script);
		}
	};

	return new IgeLoader();
}());