/**
 * When added to a viewport, automatically adds entity rotate
 * capabilities to the selected entity in the scenegraph viewer.
 */
var IgeEditorComponent = IgeEventingClass.extend({
	classId: 'IgeEditorComponent',
	componentId: 'editor',

	/**
	 * @constructor
	 * @param {IgeObject} entity The object that the component is added to.
	 * @param {Object=} options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	init: function (entity, options) {
		var self = this;
		
		this._entity = entity;
		this._options = options;
		this._showStats = 0;
		
		// Add the editor panels component
		this.addComponent(IgeEditorPanelsComponent);
		
		// Load jQuery, the editor will use it for DOM manipulation simplicity
		ige.requireScript(igeRoot + 'components/editor/vendor/jquery.2.0.3.min.js');
		
		// Load jsRender for HTML template support
		ige.requireScript(igeRoot + 'components/editor/vendor/jsRender.js');
		
		// Object mutation observer polyfill
		ige.requireScript(igeRoot + 'components/editor/vendor/observe.js');
		
		// Load plugin styles
		//ige.requireStylesheet(igeRoot + 'components/editor/vendor/treeview/jquery.treeview.css');
		ige.requireStylesheet(igeRoot + 'components/editor/vendor/treeview_simple/css/style.css');
		
		// Load the editor stylesheet
		ige.requireStylesheet(igeRoot + 'components/editor/css/editor.css');
		
		// Listen for scenegraph tree selection updates
		ige.on('sgTreeSelectionChanged', function (objectId) {
			self._objectSelected(ige.$(objectId));
		});
		
		// Wait for all required files to finish loading
		ige.on('allRequireScriptsLoaded', function () {
			// Load jquery plugins
			ige.requireScript(igeRoot + 'components/editor/vendor/autoback.jquery.js');
			ige.requireScript(igeRoot + 'components/editor/vendor/tree/tree.jquery.js');
			//ige.requireScript(igeRoot + 'components/editor/vendor/treeview/jquery.treeview.js');
			ige.requireScript(igeRoot + 'components/editor/vendor/treeview_simple/treeview_simple.jquery.js');
			
			ige.on('allRequireScriptsLoaded', function () {
				// Load editor html into the DOM
				$.ajax({
					url: igeRoot + 'components/editor/html/root.html',
					success: function (data) {
						// Add the html
						$('body').append($(data));
						
						// Add auto-backing
						$('.backed').autoback();
						
						// Observe changes to the engine to update our display
						Object.observe(ige, function (changes) {
							changes.forEach(function (change) {
								switch (change.name) {
									case '_fps':
										// Update the fps
										$('#fpsCounter').html(ige._fps + ' fps');
										break;
								}
							});
						});
						
						Object.observe(ige._children, function (changes) {
							self.updateSceneGraph();
						});
					},
					dataType: 'html'
				});
			}, null, true);
		}, null, true);
		
		// Set the component to inactive to start with
		this._enabled = true;
		
		this.log('Init complete');
	},
	
	updateSceneGraph: function () {
		var sgContent = $('#scenegraphContent');
		
		sgContent.html('')
			.tree({
				data: ige.getSceneGraphData()
			});
		
		$(sgContent.find('ul')[0]).treeview();
	},

	/**
	 * Gets / sets the enabled flag. If set to true, 
	 * operations will be processed. If false, no operations will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled: function (val) {
		var self = this;

		if (val !== undefined) {
			this._enabled = val;
			return this._entity;
		}

		return this._enabled;
	},
	
	_objectSelected: function (obj) {
		if (obj) {
			ige.editor.panels.showPanelByInstance(obj);
		}
	},
	
	/**
	 * Updates the stats HTML overlay with the latest data.
	 * @private
	 */
	_statsTick: function () {
		var self = ige.editor,
			i,
			watchCount,
			watchItem,
			itemName,
			res,
			html = '';

		// Check if the stats output is enabled
		if (self._showStats && !self._statsPauseUpdate) {
			switch (self._showStats) {
				case 1:
					/*if (self._watch && self._watch.length) {
						watchCount = self._watch.length;

						for (i = 0; i < watchCount; i++) {
							watchItem = self._watch[i];

							if (typeof(watchItem) === 'string') {
								itemName = watchItem;
								try {
									eval('res = ' + watchItem);
								} catch (err) {
									res = '<span style="color:#ff0000;">' + err + '</span>';
								}
							} else {
								itemName = watchItem.name;
								res = watchItem.value;
							}
							html += i + ' (<a href="javascript:ige.watchStop(' + i + '); ige._statsPauseUpdate = false;" style="color:#cccccc;" onmouseover="ige._statsPauseUpdate = true;" onmouseout="ige._statsPauseUpdate = false;">Remove</a>): <span style="color:#7aff80">' + itemName + '</span>: <span style="color:#00c6ff">' + res + '</span><br />';
						}
						html += '<br />';
					}*/
					/*html += '<div class="sgButton" title="Show / Hide SceneGraph Tree" onmouseup="ige.toggleShowEditor();">Scene</div> <span class="met" title="Frames Per Second">' + self._fps + ' fps</span> <span class="met" title="Draws Per Second">' + self._dps + ' dps</span> <span class="met" title="Draws Per Tick">' + self._dpt + ' dpt</span> <span class="met" title="Update Delta (How Long the Last Update Took)">' + self._updateTime + ' ms\/ud</span> <span class="met" title="Render Delta (How Long the Last Render Took)">' + self._renderTime + ' ms\/rd</span> <span class="met" title="Tick Delta (How Long the Last Tick Took)">' + self._tickTime + ' ms\/pt</span>';

					if (self.network) {
						// Add the network latency too
						html += ' <span class="met" title="Network Latency (Time From Server to This Client)">' + self.network._latency + ' ms\/net</span>';
					}

					self._statsDiv.innerHTML = html;*/
					
					
					break;
			}
		}
	}
});
