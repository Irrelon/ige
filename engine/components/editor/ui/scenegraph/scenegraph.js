var UiSceneGraph = IgeEventingClass.extend({
	classId: 'UiSceneGraph',
	
	init: function () {
		var self = this;
		
		ige.requireStylesheet(igeRoot + 'components/editor/ui/scenegraph/scenegraph.css');
		
		// Add tab to tabs
		$('<div class="tab active" data-content="scenegraphContent">SceneGraph</div>')
			.appendTo('#tabs');
		
		// Add content html
		$('<div id="scenegraphContent" class="tabContent active tree"></div>')
			.appendTo('#tabContents');
		
		Object.observe(ige._children, function (changes) {
			self.updateSceneGraph();
		});
	},
	
	ready: function () {
		// Render scenegraph
		this.updateSceneGraph();
		
		// Hook toolbox select tool so we can keep in sync
		ige.editor.on('selectedObject', function () {
			
		});
	},
	
	updateSceneGraph: function () {
		var sgContent = $('#scenegraphContent');
		
		sgContent.html('')
			.tree({
				data: ige.getSceneGraphData()
			});
		
		$(sgContent.find('ul')[0]).treeview();
	}
});

// Init
ige.editor.ui.scenegraph = new UiSceneGraph();