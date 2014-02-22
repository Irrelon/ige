var UiSceneGraph = IgeEventingClass.extend({
	classId: 'UiSceneGraph',
	
	init: function () {
		var self = this;
		
		ige.requireStylesheet(igeRoot + 'components/editor/ui/scenegraph/scenegraph.css');
		
		// Add tab to tabs
		$('<div class="tab" data-content="scenegraphContent" title="Scene Graph"><span class="icon graph"></span></div>')
			.insertAfter('#tabs .tab1');
		
		// Add content html
		$('<div id="scenegraphContent" class="tabContent"><div class="header"><div class="label">Scene Graph</div><div class="controls"></div></div><div class="tree igeEditorGroup"></div></div>')
			.appendTo('#tabContents');
		
		// Add controls
		$('<div class="control" title="Refresh SceneGraph Tree"><span id="refreshSceneGraph" class="halflings-icon white refresh"></span></div>')
			.on('click', function () {
				ige.editor.ui.scenegraph.updateSceneGraph();
			})
			.appendTo('#scenegraphContent .header .controls');
	},
	
	ready: function () {
		// Render scenegraph
		this.updateSceneGraph();
		
		// Hook editor select object updates so we can keep in sync
		ige.editor.on('selectedObject', function (id) {
			ige.editor.ui.scenegraph.selectObjectById(id);
		});
	},
	
	selectObjectById: function (id) {
		var sg = $('#scenegraphContent .tree');
		sg.find('.igeObject.selected').removeClass('selected');
		$(sg.find('#' + id).find('.igeObject')[0]).addClass('selected');
	},
	
	updateSceneGraph: function () {
		var sgContent = $('#scenegraphContent .tree');
		
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
		
		// Make sure we have the current selection highlighted
		if (ige.editor._selectedObject) {
			this.selectObjectById(ige.editor._selectedObject.id());
		}
	}
});

// Init
ige.editor.ui.scenegraph = new UiSceneGraph();