StatusBarPanel = IgeClass.extend({
	init: function () {
		$('<div id="mouseDetails" style="padding: 3px; padding-left:6px;">Screen: 0, 0 | World: 0, 0 | Local: 0, 0</div>').appendTo('#statusBar');
	}
});

editor.panel('statusBar', StatusBarPanel);