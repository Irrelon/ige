ige = (function () {
	var ige = {
		cocoonJs: {
			detected: typeof(ext) !== 'undefined' && typeof(ext.IDTK_APP) !== 'undefined'
		},

		forward: function (js) {
			if (this.cocoonJs.detected) {
				ext.IDTK_APP.makeCall("forward", js);
				return false;
			} else {
				window.parent.ige.layerCall(js);
			}
		}
	};

	return ige;
}());

ige.forward("ige.log('Overlay layer communication initiated');");