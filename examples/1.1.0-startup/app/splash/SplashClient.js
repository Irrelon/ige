var appCore = require('../../../../index');

appCore.module('SplashClient', function ($ige) {
	var SplashClient = function () {
		
	};
	
	SplashClient.prototype.hello = function () {
		// We could navigate to a new scene here
		//$ige.go('app.myNewScene');
		alert('Hello');
	};
	
	SplashClient.prototype.fullscreen = function () {
		// Show the fullscreen dom element
		if (document.getElementById('fullScreenDialog').style.display !== 'block') {
			document.getElementById('fullScreenDialog').style.display = 'block';
		} else {
			document.getElementById('fullScreenDialog').style.display = 'none';
		}
	};
	
	return SplashClient;
});