ige = (function () {
	var ige = {
		cocoonJs: {
			detected: typeof(ext) !== 'undefined' && typeof(ext.IDTK_APP) !== 'undefined'
		},

		forward: function (js) {
			if (this.cocoonJs.detected) {
				console.log('Making cocoonjs "makeCall" with: ' + js);
				var ret = ext.IDTK_APP.makeCall("forward", js);
				console.log('Call returned: ' + ret);

				return false;
			} else {
				window.parent.ige.layerCall(js);
			}
		}
	};

	return ige;
}());

ige.forward("ige.log('Overlay layer communication initiated');");