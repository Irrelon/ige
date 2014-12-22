var IgeEditorPanelsComponent = IgeEventingClass.extend({
	classId: 'IgeEditorPanelsComponent',
	componentId: 'panels',
	
	init: function () {
		this._panelProps = {};
		
		this._templateCache = {};
		this._cacheTemplates = true;
		
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
				'texture': {
					label: 'Texture',
					desc: '',
					order: 1,
					props: {
						'_texture': {
							label: 'Set Texture',
							desc: '',
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
								$('#igeEditorProperty_' + propItem.id).find('.setTexture').on('change', function () {
									var textureId = $(this).val();
									
									if (textureId && ige.$(textureId)) {
										// Set the object's texture to the newly selected one
										obj.texture(ige.$(textureId));
									} else {
										// Set texture to none
										delete obj._texture;
									}
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberInt.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberInt.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberIntMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloat.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatMinMax.html',
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (obj._velocityVector && obj._velocityVector.base) {
									propItem.x = obj._velocityVector.base.x;
									propItem.y = obj._velocityVector.base.y;
									propItem.z = obj._velocityVector.base.z;
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
									if (obj._velocityVector && obj._velocityVector.base) {
										obj._velocityVector.base.x = x;
									} else {
										obj._velocityVector = new IgePoint(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector && obj._velocityVector.base) {
										obj._velocityVector.base.y = y;
									} else {
										obj._velocityVector = new IgePoint(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector && obj._velocityVector.base) {
										obj._velocityVector.base.z = z;
									} else {
										obj._velocityVector = new IgePoint(z, 0, 0);
									}
								});
							}
						},
						'_velocityVector_min': {
							label: 'Variance Min Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (obj._velocityVector && obj._velocityVector.min) {
									propItem.x = obj._velocityVector.min.x;
									propItem.y = obj._velocityVector.min.y;
									propItem.z = obj._velocityVector.min.z;
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
									if (obj._velocityVector && obj._velocityVector.min) {
										obj._velocityVector.min.x = x;
									} else {
										obj._velocityVector = new IgePoint(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector && obj._velocityVector.min) {
										obj._velocityVector.min.y = y;
									} else {
										obj._velocityVector = new IgePoint(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector && obj._velocityVector.min) {
										obj._velocityVector.min.z = z;
									} else {
										obj._velocityVector = new IgePoint(z, 0, 0);
									}
								});
							}
						},
						'_velocityVector_max': {
							label: 'Variance Max Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatXYZ.html',
							// Setup values for the template
							beforeRender: function (obj, propItem) {
								if (obj._velocityVector && obj._velocityVector.max) {
									propItem.x = obj._velocityVector.max.x;
									propItem.y = obj._velocityVector.max.y;
									propItem.z = obj._velocityVector.max.z;
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
									if (obj._velocityVector && obj._velocityVector.max) {
										obj._velocityVector.max.x = x;
									} else {
										obj._velocityVector = new IgePoint(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector && obj._velocityVector.max) {
										obj._velocityVector.max.y = y;
									} else {
										obj._velocityVector = new IgePoint(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._velocityVector && obj._velocityVector.max) {
										obj._velocityVector.max.z = z;
									} else {
										obj._velocityVector = new IgePoint(z, 0, 0);
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
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatXYZ.html',
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
										obj._linearForceVector = new IgePoint(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.base) {
										obj._linearForceVector.base.y = y;
									} else {
										obj._linearForceVector = new IgePoint(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.base) {
										obj._linearForceVector.base.z = z;
									} else {
										obj._linearForceVector = new IgePoint(z, 0, 0);
									}
								});
							}
						},
						'_linearForceVector_min': {
							label: 'Variance Min Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatXYZ.html',
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
										obj._linearForceVector = new IgePoint(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.min) {
										obj._linearForceVector.min.y = y;
									} else {
										obj._linearForceVector = new IgePoint(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.min) {
										obj._linearForceVector.min.z = z;
									} else {
										obj._linearForceVector = new IgePoint(z, 0, 0);
									}
								});
							}
						},
						'_linearForceVector_max': {
							label: 'Variance Max Vector',
							desc: '',
							alwaysShow: true,
							templateUrl: igeRoot + 'components/editor/panels/templates/NumberFloatXYZ.html',
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
										obj._linearForceVector = new IgePoint(x, 0, 0);
									}
								});
								
								selector.find('.setNumberY').on('change', function () {
									var y = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.max) {
										obj._linearForceVector.max.y = y;
									} else {
										obj._linearForceVector = new IgePoint(y, 0, 0);
									}
								});
								
								selector.find('.setNumberZ').on('change', function () {
									var z = parseFloat($(this).val());
									
									// Set the property value to the newly selected one
									if (obj._linearForceVector && obj._linearForceVector.max) {
										obj._linearForceVector.max.z = z;
									} else {
										obj._linearForceVector = new IgePoint(z, 0, 0);
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
							self.template(igeRoot + 'components/editor/panels/templates/group.html', function (err, template) {
								if (!err) {
									var groupSelector = $($.parseHTML(template.render(groupData))),
										propName,
										propItem,
										properties = groupData.props;
									
									// Add the group to the DOM
									groupSelector.appendTo('#igeSgEditorRoot');
									
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
														propertyTemplateUrl = propData.templateUrl || igeRoot + 'components/editor/panels/templates/' + igeClass + '.html';
													} else {
														propertyTemplateUrl = propData.templateUrl
													}
													
													if (propertyTemplateUrl) {
														// Generate HTML for this property from the template
														self.template(propertyTemplateUrl, function (err, template) {
															if (!err) {
																if (propData.beforeRender) {
																	propData.beforeRender(propData.obj, propData);
																}
																
																var propSelector = $($.parseHTML(template.render(propData)));
																
																// Add the property selector to the DOM
																propData.groupSelector.append(propSelector);
																
																// Call any afterRender callback if there is one
																if (propData.afterRender) {
																	propData.afterRender(propData.obj, propData);
																}
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
	},
	
	template: function (url, callback) {
		var self = this;
		
		if (!this._cacheTemplates || !this._templateCache[url]) {
			$.ajax(url, {
				async: true,
				dataType: 'text',
				complete: function (xhr, status) {
					if (status === 'success') {
						// Convert the text into a jsRender template object
						var template = jsviews.templates(xhr.responseText);
						
						if (self._cacheTemplates) {
							self._templateCache[url] = template;
						}
						
						if (callback) { callback(false, template); }
					} else {
						if (callback) { callback(true, status); }
					}
				}
			});
		} else {
			if (callback) { callback(false, this._templateCache[url]); }
		}
	}
});