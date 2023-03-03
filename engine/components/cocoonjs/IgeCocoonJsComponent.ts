var IgeCocoonJsComponent = IgeEventingClass.extend({
	classId: 'IgeCocoonJsComponent',
	componentId: 'cocoonJs',

	init: function () {
		this.detected = typeof(ext) !== 'undefined' && typeof(ext.IDTK_APP) !== 'undefined';

		if (this.detected) {
			this.log('CocoonJS support enabled!');
		}
	},

	// TODO: Finish keyboard implementation
	showInputDialog: function(title, message, initialValue, type, cancelText, okText) {
		if (this.detected) {
			title = title || '';
			message = message || '';
			initialValue = initialValue || '';
			type = type || 'text';
			cancelText = cancelText || 'Cancel';
			okText = okText || 'OK';

			ext.IDTK_APP.makeCall(
				'showTextDialog',
				title,
				message,
				initialValue,
				type,
				cancelText,
				okText
			);
		} else {
			this.log('Cannot open CocoonJS input dialog! CocoonJS is not detected!', 'error');
		}
	},

	/**
	 * Asks the API to load the url and show the web view.
	 * @param url
	 */
	showWebView: function (url) {
		if (this.detected) {
			// Forward a JS call to the webview IDTK API
			ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('loadPath', '" + url + "')");
			ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('show');");
		}
	},

	/**
	 * Asks the API to hide the web view.
	 */
	hideWebView: function () {
		if (this.detected) {
			// Forward a JS call to the webview IDTK API
			ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('hide');");
		}
	}
});