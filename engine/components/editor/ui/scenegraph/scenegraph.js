var UiSceneGraph = IgeEventingClass.extend({
	classId: 'UiSceneGraph',
	
	init: function () {
		var self = this;
		
		ige.requireStylesheet(igeRoot + 'components/editor/ui/scenegraph/scenegraph.css');
		
		// Add tab to tabs
		$('<div class="tab" data-content="scenegraphContent" title="Scene Graph"><span class="icon graph"></span></div>')
			.appendTo('#tabs');
		
		// Add content html
		$('<div id="scenegraphContent" class="tabContent tree"></div>')
			.appendTo('#tabContents');
		
		/*Object.observe(ige._children, function (changes) {
			self.updateSceneGraph();
		});*/
	},
	
	ready: function () {
		// Render scenegraph
		this.updateSceneGraph();
		
		// Hook editor select object updates so we can keep in sync
		ige.editor.on('selectedObject', function (id) {
			var sg = $('#scenegraphContent');
			sg.find('.igeObject.selected').removeClass('selected');
			$(sg.find('#' + id).find('.igeObject')[0]).addClass('selected');
		});
	},
	
	updateSceneGraph: function () {
		var sgContent = $('#scenegraphContent');
		
		sgContent.html('')
			.tree({
				data: ige.getSceneGraphData()
			});
		
		$(sgContent.find('ul')[0]).treeview();
		
		// Hook click events on the scenegraph tree
		sgContent.find('.igeObject').click(function () {
			var elem = $(this);
			ige.editor.selectObject(elem.attr('data-id'));
		});
	}
});

// Init
ige.editor.ui.scenegraph = new UiSceneGraph();