var UiPanels = IgeEventingClass.extend({
	classId: 'UiPanels',
	
	init: function () {
		this._panelProps = {};
		
		// Add tab to tabs
		$('<div class="tab" data-content="propertiesContent" title="Properties"><span class="icon props"></span></div>')
			.insertAfter('#tabs .tab2');
		
		// Add content html
		$('<div id="propertiesContent" class="tabContent"><div class="header"><div class="label" id="objectLabel">Object Properties</div></div></div>')
			.appendTo('#tabContents');
		
		// Define the classes and properties to expose
		this.definition('IgeEntity', {
			'groups': {
				'transform': {
					label: 'Transform',
					desc: '',
					order: 0,
					props: {
						'_translate': {
							label: 'Translate',
							desc: '',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].x = parseFloat($(this).val());
								});
								
								selector.find('.setNumberY').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].y = parseFloat($(this).val());
								});
								
								selector.find('.setNumberZ').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].z = parseFloat($(this).val());
								});
							}
						},
						'_scale': {
							label: 'Scale',
							desc: '',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].x = parseFloat($(this).val());
								});
								
								selector.find('.setNumberY').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].y = parseFloat($(this).val());
								});
								
								selector.find('.setNumberZ').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].z = parseFloat($(this).val());
								});
							}
						},
						'_rotate': {
							label: 'Rotate',
							desc: '',
							beforePropertyValue: function (propName, propVal) {
								
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].x = parseFloat($(this).val());
								});
								
								selector.find('.setNumberY').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].y = parseFloat($(this).val());
								});
								
								selector.find('.setNumberZ').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].z = parseFloat($(this).val());
								});
							}
						}
					}
				},
				'geometry': {
					label: 'Geometry',
					desc: '',
					order: 0,
					props: {
						'_bounds2d': {
							label: '2d Bounds',
							desc: '',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);

								selector.find('.setNumberX').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].x = parseFloat($(this).val());
									obj[propItem.id].x2 = obj[propItem.id].x / 2;
								});

								selector.find('.setNumberY').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].y = parseFloat($(this).val());
									obj[propItem.id].y2 = obj[propItem.id].y / 2;
								});
							}
						},
						'_bounds3d': {
							label: '3d Bounds',
							desc: '',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);

								selector.find('.setNumberX').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].x = parseFloat($(this).val());
									obj[propItem.id].x2 = obj[propItem.id].x / 2;
								});

								selector.find('.setNumberY').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].y = parseFloat($(this).val());
									obj[propItem.id].y2 = obj[propItem.id].y / 2;
								});

								selector.find('.setNumberZ').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].z = parseFloat($(this).val());
									obj[propItem.id].z2 = obj[propItem.id].z / 2;
								});
							}
						}
					}
				},
				'texture': {
					label: 'Texture',
					desc: '',
					order: 1,
					props: {
						'_texture': {
							label: 'Set Texture',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/IgeTexture.html',
							// Setup the data the template needs to render correctly
							beforeRender: function (obj, propItem) {
								var textureArr = ige._textureStore,
									textureIndex,
									tex;
								
								// Setup an array for the textures
								propItem.availableTextures = [];
								
								// Setup a "no texture" entry
								propItem.availableTextures.push({
									id: '',
									url: 'No Texture',
									selected: null
								});
								
								for (textureIndex = 0; textureIndex < textureArr.length; textureIndex++) {
									tex = textureArr[textureIndex];
									
									propItem.availableTextures.push({
										id: tex.id(),
										url: tex.url(),
										selected: obj._texture ? tex.id() === obj._texture.id() : null
									});
								}
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var panel = $('#igeEditorProperty_' + propItem.id);
								
								panel.find('.setTexture').on('change', function () {
									var textureId = $(this).val();
									
									if (textureId && ige.$(textureId)) {
										// Set the object's texture to the newly selected one
										obj.texture(ige.$(textureId));
									} else {
										// Set texture to none
										delete obj._texture;
									}
									
									// Update the cell panel
									var updateMethod = $('#igeEditorProperty__cell').data('igePanelUpdate');
									if (updateMethod) {
										updateMethod();
									} else {
										console.log('Error, unable to update cell property panel!');
									}
								});
								
								panel.find('.dimensionsFromTexture').on('click', function () {
									if (obj._texture) {
										obj.dimensionsFromTexture();
									}
								});
								
								panel.find('.dimensionsFromCell').on('click', function () {
									if (obj._texture) {
										obj.dimensionsFromCell();
									}
								});
							}
						},
						'_cell': {
							label: 'Texture Cell',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/ImageGallery.html',
							// Setup the data the template needs to render correctly
							beforeRender: function (obj, propItem) {
								var cellIndex,
									columns,
									rows,
									width,
									height,
									xScale,
									yScale,
									x, y;
								
								// Setup an array for the textures
								propItem.images = [];
								
								if (obj._texture && obj._texture._cells && obj._texture.horizontalCells && obj._texture.verticalCells) {
									columns = obj._texture.horizontalCells();
									rows = obj._texture.verticalCells();
									width = obj._texture.sizeX();
									height = obj._texture.sizeY();
									xScale = columns * 40;
									yScale = rows * 40;
									
									for (y = 0; y < rows; y++) {
										for (x = 0; x < columns; x++) {
											var imgObj = {
												url: obj._texture.url(),
												selected: (x + (y * columns) + 1) === cellIndex,
												style: 'width: 40px; height: 40px; background-position: ' + (-x * 40) + 'px ' + (-y * 40) + 'px; background-size: ' + (xScale) + 'px ' + (yScale) + 'px',
												cellIndex: x + (y * columns) + 1
											};
											
											propItem.images.push(imgObj);
										}
									}
								}
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var panel = $('#igeEditorProperty_' + propItem.id);
								
								panel.find('.image').on('click', function () {
									panel.find('.image').removeClass('active');
									var cellId = parseInt($(this).addClass('active').attr('data-cell-index'));
									
									if (cellId) {
										// Set the object's texture to the newly selected one
										obj.cell(cellId);
									}
								});
							}
						},
						'_anchor': {
							label: 'Image Anchor Point',
							desc: '',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);

								selector.find('.setNumberX').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].x = parseFloat($(this).val());
									obj[propItem.id].x2 = obj[propItem.id].x / 2;
									
									obj.aabb(true);
								});

								selector.find('.setNumberY').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id].y = parseFloat($(this).val());
									obj[propItem.id].y2 = obj[propItem.id].y / 2;
									
									obj.aabb(true);
								});
							}
						},
					}
				},
				'isometric': {
					label: '2d &amp; Isometric Settings',
					desc: '',
					order: 1,
					props: {
						'_isometricMounts': {
							label: 'Isometric Mounts',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/List.html',
							// Setup the data the template needs to render correctly
							beforeRender: function (obj, propItem) {
								var textureArr = ige._textureStore,
									textureIndex,
									tex;
								
								// Setup an array for the list
								propItem.list = [{
									value: 'yes',
									text: 'Yes',
									selected: obj._mountMode === 1 ? true : false
								}, {
									value: 'no',
									text: 'No',
									selected: obj._mountMode === 0 ? true : false
								}];
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var panel = $('#igeEditorProperty_' + propItem.id);
								
								panel.find('.listValue').on('change', function () {
									var itemValue = $(this).val();
									
									if (itemValue === 'yes') {
										// Set the object's texture to the newly selected one
										obj.isometricMounts(true);
									} else {
										obj.isometricMounts(false);
									}
								});
							}
						}
					}
				},
				'visibility': {
					label: 'Visibility',
					desc: '',
					order: 1,
					props: {
						'_hidden': {
							label: 'Hidden',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/List.html',
							// Setup the data the template needs to render correctly
							beforeRender: function (obj, propItem) {
								var textureArr = ige._textureStore,
									textureIndex,
									tex;
								
								// Setup an array for the list
								propItem.list = [{
									value: 'yes',
									text: 'Yes',
									selected: obj._hidden
								}, {
									value: 'no',
									text: 'No',
									selected: !obj._hidden
								}];
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var panel = $('#igeEditorProperty_' + propItem.id);
								
								panel.find('.listValue').on('change', function () {
									var itemValue = $(this).val();
									
									if (itemValue === 'yes') {
										// Set the object's hidden value
										obj.hide();
									} else {
										obj.show();
									}
								});
							}
						},
						'_opacity': {
							label: 'Opacity',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj.opacity(parseFloat($(this).val()));
								});
							}
						}
					}
				},
				'mounting': {
					label: 'Mounting &amp; Draw Order',
					desc: '',
					order: 1,
					props: {
						'_layer': {
							label: 'Layer',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberInt.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj.layer(parseInt($(this).val()));
								});
							}
						},
						'_depth': {
							label: 'Depth',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberInt.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj.layer(parseInt($(this).val()));
								});
							}
						}
					}
				}
			}
		});
		
		this.definition('IgeTileMap2d', {
			'groups': {
				'tiles': {
					label: 'Tile Settings',
					desc: '',
					order: 1,
					props: {
						'_tileWidth': {
							label: 'Width of Tiles',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberInt.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj.tileWidth(parseInt($(this).val()));
								});
							}
						},
						'_tileHeight': {
							label: 'Height of Tiles',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberInt.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj.tileHeight(parseInt($(this).val()));
								});
							}
						}
					}
				}
			}
		});
		
		this.definition('IgeParticleEmitter', {
			'groups': {
				'particleQuantity': {
					label: 'Particle Quantity',
					desc: '',
					order: 0,
					props: {
						'_quantityTimespan': {
							label: 'Timespan',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberInt.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseInt($(this).val());
									obj.updateSettings();
								});
							}
						},
						'_quantityBase': {
							label: 'Base Value',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberInt.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseInt($(this).val());
									obj.updateSettings();
								});
							}
						},
						'_quantityVariance': {
							label: 'Variance',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberIntMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseInt($(this).val());
									obj.updateSettings();
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseInt($(this).val());
									obj.updateSettings();
								});
							}
						}
					}
				},
				
				'particleTranslate': {
					label: 'Particle Translate',
					desc: '',
					order: 0,
					props: {
						'_translateBaseX': {
							label: 'Base X',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_translateBaseY': {
							label: 'Base Y',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_translateBaseZ': {
							label: 'Base Z',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_translateVarianceX': {
							label: 'Variance X',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						},
						'_translateVarianceY': {
							label: 'Variance Y',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						},
						'_translateVarianceZ': {
							label: 'Variance Z',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'particleInitialRotate': {
					label: 'Particle Initial Rotate',
					desc: '',
					order: 0,
					props: {
						'_rotateBase': {
							label: 'Base',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_rotateVariance': {
							label: 'Variance',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'particleDeathRotate': {
					label: 'Particle Death Rotate',
					desc: '',
					order: 0,
					props: {
						'_deathRotateBase': {
							label: 'Base {Degrees}',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_deathRotateVariance': {
							label: 'Variance {Degrees} (Min, Max)',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'particleInitialScale': {
					label: 'Particle Initial Scale',
					desc: '',
					order: 0,
					props: {
						'_scaleBaseX': {
							label: 'Base X',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_scaleBaseY': {
							label: 'Base Y',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_scaleBaseZ': {
							label: 'Base Z',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_scaleVarianceX': {
							label: 'Variance X',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						},
						'_scaleVarianceY': {
							label: 'Variance Y',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						},
						'_scaleVarianceZ': {
							label: 'Variance Z',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'particleDeathScale': {
					label: 'Particle Death Scale',
					desc: '',
					order: 0,
					props: {
						'_deathScaleBaseX': {
							label: 'Base X',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_deathScaleBaseY': {
							label: 'Base Y',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_deathScaleBaseZ': {
							label: 'Base Z',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_deathScaleVarianceX': {
							label: 'Variance X',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						},
						'_deathScaleVarianceY': {
							label: 'Variance Y',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						},
						'_deathScaleVarianceZ': {
							label: 'Variance Z',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'particleInitialOpacity': {
					label: 'Particle Initial Opacity',
					desc: '',
					order: 0,
					props: {
						'_opacityBase': {
							label: 'Base',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_opacityVariance': {
							label: 'Variance',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'particleDeathOpacity': {
					label: 'Particle Death Opacity',
					desc: '',
					order: 0,
					props: {
						'_deathOpacityBase': {
							label: 'Base',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_deathOpacityVariance': {
							label: 'Variance',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'particleLife': {
					label: 'Particle Life',
					desc: '',
					order: 0,
					props: {
						'_lifeBase': {
							label: 'Base',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloat.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								$('#igeEditorProperty_' + propItem.id).find('.setNumber').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id] = parseFloat($(this).val());
								});
							}
						},
						'_lifeVariance': {
							label: 'Variance',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatMinMax.html',
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberMin').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][0] = parseFloat($(this).val());
								});
								
								selector.find('.setNumberMax').on('change', function () {
									// Set the property value to the newly selected one
									obj[propItem.id][1] = parseFloat($(this).val());
								});
							}
						}
					}
				},
				
				'velocityVector': {
					label: 'Velocity Vector',
					desc: '',
					order: 0,
					props: {
						'_velocityVector_base': {
							label: 'Base Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (!obj._velocityVector) {
									obj.velocityVector(new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0));
								}
								
								if (!obj._velocityVector.base) {
									obj._velocityVector.base = new IgePoint3d(0, 0, 0);
								}
								propItem.x = obj._velocityVector.base.x;
								propItem.y = obj._velocityVector.base.y;
								propItem.z = obj._velocityVector.base.z;
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									var x = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.base) {
											obj._velocityVector.base.x = x;
										} else {
											obj._velocityVector.base = new IgePoint3d(x, 0, 0);
										}
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.base) {
											obj._velocityVector.base.y = y;
										} else {
											obj._velocityVector.base = new IgePoint3d(0, y, 0);
										}
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.base) {
											obj._velocityVector.base.z = z;
										} else {
											obj._velocityVector.base = new IgePoint3d(0, 0, z);
										}
									}
								});
							}
						},
						'_velocityVector_min': {
							label: 'Variance Min Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (!obj._velocityVector) {
									obj.velocityVector(new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0));
								}
								
								if (!obj._velocityVector.min) {
									obj._velocityVector.min = new IgePoint3d(0, 0, 0);
								}
								propItem.x = obj._velocityVector.min.x;
								propItem.y = obj._velocityVector.min.y;
								propItem.z = obj._velocityVector.min.z;
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									var x = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.min) {
											obj._velocityVector.min.x = x;
										} else {
											obj._velocityVector.min = new IgePoint3d(x, 0, 0);
										}
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.min) {
											obj._velocityVector.min.y = y;
										} else {
											obj._velocityVector.min = new IgePoint3d(0, y, 0);
										}
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.min) {
											obj._velocityVector.min.z = z;
										} else {
											obj._velocityVector.min = new IgePoint3d(0, 0, z);
										}
									}
								});
							}
						},
						'_velocityVector_max': {
							label: 'Variance Max Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (!obj._velocityVector) {
									obj.velocityVector(new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0));
								}
								
								if (!obj._velocityVector.max) {
									obj._velocityVector.max = new IgePoint3d(0, 0, 0);
								}
								propItem.x = obj._velocityVector.max.x;
								propItem.y = obj._velocityVector.max.y;
								propItem.z = obj._velocityVector.max.z;
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									var x = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.max) {
											obj._velocityVector.max.x = x;
										} else {
											obj._velocityVector.max = new IgePoint3d(x, 0, 0);
										}
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.max) {
											obj._velocityVector.max.y = y;
										} else {
											obj._velocityVector.max = new IgePoint3d(0, y, 0);
										}
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector) {
										if (obj._velocityVector.max) {
											obj._velocityVector.max.z = z;
										} else {
											obj._velocityVector.max = new IgePoint3d(0, 0, z);
										}
									}
								});
							}
						}
					}
				},
				
				'linearForceVector': {
					label: 'Linear Force Vector',
					desc: '',
					order: 0,
					props: {
						'_linearForceVector_base': {
							label: 'Base Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (obj._linearForceVector && obj._linearForceVector.base) {
									propItem.x = obj._linearForceVector.base.x;
									propItem.y = obj._linearForceVector.base.y;
									propItem.z = obj._linearForceVector.base.z;
								} else {
									propItem.x = propItem.y = propItem.z = 0;
								}
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									var x = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.base) {
										obj._linearForceVector.base.x = x;
									} else {
										obj._linearForceVector = new IgePoint3d(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.base) {
										obj._linearForceVector.base.y = y;
									} else {
										obj._linearForceVector = new IgePoint3d(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.base) {
										obj._linearForceVector.base.z = z;
									} else {
										obj._linearForceVector = new IgePoint3d(z, 0, 0);
									}
								});
							}
						},
						'_linearForceVector_min': {
							label: 'Variance Min Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (obj._linearForceVector && obj._linearForceVector.min) {
									propItem.x = obj._linearForceVector.min.x;
									propItem.y = obj._linearForceVector.min.y;
									propItem.z = obj._linearForceVector.min.z;
								} else {
									propItem.x = propItem.y = propItem.z = 0;
								}
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									var x = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.min) {
										obj._linearForceVector.min.x = x;
									} else {
										obj._linearForceVector = new IgePoint3d(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.min) {
										obj._linearForceVector.min.y = y;
									} else {
										obj._linearForceVector = new IgePoint3d(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.min) {
										obj._linearForceVector.min.z = z;
									} else {
										obj._linearForceVector = new IgePoint3d(z, 0, 0);
									}
								});
							}
						},
						'_linearForceVector_max': {
							label: 'Variance Max Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/ui/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (obj._linearForceVector && obj._linearForceVector.max) {
									propItem.x = obj._linearForceVector.max.x;
									propItem.y = obj._linearForceVector.max.y;
									propItem.z = obj._linearForceVector.max.z;
								} else {
									propItem.x = propItem.y = propItem.z = 0;
								}
							},
							// Enable any listeners and logic to take action when the user interacts with the panel
							afterRender: function (obj, propItem) {
								var selector = $('#igeEditorProperty_' + propItem.id);
								
								selector.find('.setNumberX').on('change', function () {
									var x = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.max) {
										obj._linearForceVector.max.x = x;
									} else {
										obj._linearForceVector = new IgePoint3d(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.max) {
										obj._linearForceVector.max.y = y;
									} else {
										obj._linearForceVector = new IgePoint3d(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.max) {
										obj._linearForceVector.max.z = z;
									} else {
										obj._linearForceVector = new IgePoint3d(z, 0, 0);
									}
								});
							}
						}
					}
				}
			}
		});
	},
	
	definition: function (className, props) {
		if (className !== undefined) {
			if (props !== undefined) {
				this._panelProps[className] = props;
				return this;
			}
			
			return this._panelProps[className];
		}
		
		return this;
	},
	
	hasPanel: function (className) {
		return Boolean(this._panelProps[className]); 
	},
	
	showPanelByClassName: function (className) {
		if (this.hasPanel(className)) {
			// Build the panel HTML
			this._buildPanelHtml(this._panelProps[className]);
		}
		
		return this;
	},
	
	showPanelByInstance: function (obj) {
		if (obj) {
			var classArr = ige.getClassDerivedList(obj),
				classIndex,
				className;
			
			// Remove all existing panels from the DOM
			$('.igeEditorPanel').remove();
			
			if (classArr) {
				// Loop the classes this object was derived from and show the relevant panels
				// in reverse order because the further up the class chain the more specialised
				// the class will likely be, and therefore the more useful the controls
				for (classIndex = 0; classIndex < classArr.length; classIndex++) {
					className = classArr[classIndex];
					
					if (this.hasPanel(className)) {
						// Build the panel HTML
						this._buildPanelHtml(this._panelProps[className], obj);
					}
				}
			}
		}
		
		return this;
	},
	
	_buildPanelHtml: function (props, obj) {
		if (obj) {
			// Loop groups and build sections for them
			var self = this,
				groupProps = props.groups,
				propName,
				item;
			
			if (groupProps) {
				for (propName in groupProps) {
					if (groupProps.hasOwnProperty(propName)) {
						item = groupProps[propName];
						
						(function (groupData) {
							// Generate HTML for this group from the template
							ige.editor.template(igeRoot + 'components/editor/ui/panels/templates/group.html', function (err, template) {
								if (!err) {
									var groupSelector = $($.parseHTML(template.render(groupData))),
										propName,
										propItem,
										properties = groupData.props;
									
									// Add the group to the DOM
									groupSelector.appendTo('#propertiesContent');
									
									// Now loop the props object and find properties that belong to this
									// group and add their rendered HTML to the DOM inside the group's content
									for (propName in properties) {
										if (properties.hasOwnProperty(propName)) {
											propItem = properties[propName];
											
											// The property is part of the group, build HTML for it
											(function (propData) {
												// Check the property currently exists in the object
												if (propData.obj && (propData.alwaysShow || propData.obj[propData.id])) {
													var igeClass,
														propertyTemplateUrl;
													
													if (propData.obj[propData.id] && typeof(propData.obj[propData.id]) === 'object') {
														// Get the IGE class that this property derives from
														igeClass = ige.findBaseClass(propData.obj[propData.id]);
														propertyTemplateUrl = propData.templateUrl || igeRoot + 'components/editor/ui/panels/templates/' + igeClass + '.html';
													} else {
														propertyTemplateUrl = propData.templateUrl
													}
													
													if (propertyTemplateUrl) {
														// Generate HTML for this property from the template
														ige.editor.template(propertyTemplateUrl, function (err, template) {
															if (!err) {
																var propSelector,
																	updateMethod;
																
																updateMethod = function () {
																	// Remove existing property panel section
																	var existingSelector = $('#igeEditorProperty_' + propData.id),
																		existingData = existingSelector.data('igePanelUpdate');
																	
																	existingSelector.remove();
																	
																	if (propData.beforeRender) {
																		propData.beforeRender(propData.obj, propData);
																	}
																	
																	propSelector = $($.parseHTML(template.render(propData)));
																	
																	// Add the property selector to the DOM
																	propData.groupSelector.append(propSelector);
																	
																	// Call any afterRender callback if there is one
																	if (propData.afterRender) {
																		propData.afterRender(propData.obj, propData);
																	}
																	
																	if (existingData) {
																		propSelector.data('igePanelUpdate', existingData);
																	}
																};
																
																updateMethod();
																propSelector.data('igePanelUpdate', updateMethod);
															}
														});
													}
												}
											}({
												id: propName,
												ige: ige,
												obj: obj,
												label: propItem.label,
												desc: propItem.desc,
												type: propItem.type,
												group: propItem.group,
												alwaysShow: propItem.alwaysShow,
												beforeRender: propItem.beforeRender,
												afterRender: propItem.afterRender,
												templateUrl: propItem.templateUrl,
												groupSelector: groupSelector
											}));
										}
									}
								}
							});
						}({
							id: propName,
							ige: ige,
							obj: obj,
							label: item.label,
							desc: item.desc,
							props: item.props
						}));
					}
				}
			}
		}
	}
});

// Init
ige.editor.ui.panels = new UiPanels();