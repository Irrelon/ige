PanelBar = IgeClass.extend({
	init: function () {
		$('<ul id="panelbar"></ul>').appendTo('#rightBar');

		// Panel bars
		$("#panelbar").kendoPanelBar({
			expandMode: "multiple"
		});

		editor._panelBar = $("#panelbar").data('kendoPanelBar');
	}
});

editor.panel('panelBar', PanelBar);