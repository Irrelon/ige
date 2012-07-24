var IGEEditor = IgeClass.extend({
	classId: 'IGEEditor',

	init: function (gameViewport, gameRootScene) {
		// Store ourselves in the ige
		ige.editor = this;

		// Store the game viewport & scene
		this._gvp = gameViewport;
		this._grs = gameRootScene;

		// Create some storage
		this._textures = {};
		this._classes = {};

		// Define our custom classes
		this._defineCustomClasses();

		// Load UI textures
		this._loadTextures();

		// Create the editor UI
		this._createUI();
	},

	_defineCustomClasses: function () {
		this._classes.ToolBarButton = IgeUiRadioButton.extend({
			classId: 'ToolBarButton',

			init: function () {
				this._super();
				this.radioGroup('menuControl')
					.mouseOver(function () {
						if (ige.editor.data('currentTool') !== this.id()) {
							this.backgroundColor('#6b6b6b');
						}
					})
					.mouseOut(function () {
						if (ige.editor.data('currentTool') !== this.id()) {
							this.backgroundColor('');
						}
					})
					.mouseUp(function () {
						this.select();
					})
					// Define the callback when the radio button is selected
					.select(function () {
						ige.editor.data('currentTool', this.id());
						this.backgroundColor('#00baff');
					})
					// Define the callback when the radio button is de-selected
					.deSelect(function () {
						this.backgroundColor('');
					});
			}
		});

		this._classes.TexturePanel = IgeUiGridPanel.extend({
			classId: 'TexturePanel',

			init: function (cellWidth, cellHeight) {
				this._super(cellWidth, cellHeight);
				this.selectedTexture = null;
			},

			refresh: function () {
				this.destroyChildren();

				var arr = ige.Texture,
					arrCount = arr.length,
					i, mover, mout, mup, sel, desel;

				mover = function () {
					if (this._parent.data('selectedTexture') !== this.data('textureIndex')) {
						this.backgroundColor('#6b6b6b');
					}
				};

				mout = function () {
					if (this._parent.data('selectedTexture') !== this.data('textureIndex')) {
						this.backgroundColor('');
					}
				};

				mup = function () {
					this.select();
				};

				sel = function () {
					this._parent.data('selectedTexture', this.data('textureIndex'));
					this.backgroundColor('#00baff');
				};

				desel = function () {
					this.backgroundColor('');
				};

				for (i = 0; i < arrCount; i++) {
					new IgeUiRadioButton()
						.radioGroup('textures')
						.data('textureIndex', i)
						.top(0)
						.left(0)
						.width(40)
						.height(40)
						//.padding(2, 2, 2, 2)
						.texture(arr[i])
						.mouseOver(mover)
						.mouseOut(mout)
						.mouseUp(mup)
						// Define the callback when the radio button is selected
						.select(sel)
						// Define the callback when the radio button is de-selected
						.deSelect(desel)
						.mount(this);
				}

				return this;
			}
		});

		// Register classes with the main engine
		ige.createClass('ToolBarButton', this._classes.ToolBarButton);
		ige.createClass('TexturePanel', this._classes.TexturePanel);
	},

	_loadTextures: function () {
		this._textures.fontVerdana10pt = new IgeFontSheet('../../tools/editor/assets/textures/fonts/verdana_10pt.png', false);

		this._textures.uiButtonCreate = new IgeTexture('../../tools/editor/assets/textures/ui/note.png');
		this._textures.uiButtonSelect = new IgeTexture('../../tools/editor/assets/textures/ui/hand.png');
		this._textures.uiButtonZoomOut = new IgeTexture('../../tools/editor/assets/textures/ui/zoom-out.png');
		this._textures.uiButtonZoomIn = new IgeTexture('../../tools/editor/assets/textures/ui/zoom-in.png');
		this._textures.uiButtonPaint = new IgeTexture('../../tools/editor/assets/textures/ui/brush.png');
		this._textures.uiButtonPaintRemove = new IgeTexture('../../tools/editor/assets/textures/ui/brush-off.png');

		this._textures.arrowCircleRight = new IgeTexture('../../tools/editor/assets/textures/ui/arrow-circle-right.png');
		this._textures.arrowCircleDown = new IgeTexture('../../tools/editor/assets/textures/ui/arrow-circle-down.png');

		return this;
	},

	_createUI: function () {
		ige.viewportDepth(true);

		this._rootScene = new IgeScene2d()
			.id('editorRootScene');

		this._editorVp = new IgeViewport()
			.id('editorVp')
			.depth(0)
			.autoSize(true)
			.scene(this._rootScene)
			.drawBounds(false) // Switch this to true to draw all bounding boxes
			.drawBoundsData(false); // Switch to true (and flag above) to see bounds data

		this._editorGameVp = new IgeViewport()
			.id('editorGameVp')
			.left(64)
			.top(26)
			.width('100%', -316)
			.height('100%', -51)
			.depth(1)
			.drawBounds(true)
			.drawBoundsData(true);
			//.camera.scaleTo(0.8, 0.8, 0.8);

		// ROOT OBJECTS ------------------------------------
		this._menuBar = new IgeUiEntity()
				.id('menuBar')
				.top(0)
				.left(0)
				.width('100%')
				.height(25)
				.backgroundColor('#333333')
				.borderBottomWidth(1)
				.borderBottomColor('#666666')
				.mount(this._rootScene);

		this.toolBar = new IgeUiEntity()
				.id('toolBar')
				.top(25)
				.left(0)
				.width(63)
				.height('100%', -50)
				.backgroundColor('#333333')
				.borderRightWidth(1)
				.borderRightColor('#666666')
				.mount(this._rootScene);

		this.rightBar = new IgeUiAutoFlow()
				.id('rightBar')
				.top(25)
				.right(0)
				.width(251)
				.height('100%', -50)
				.backgroundColor('#333333')
				.borderLeftWidth(1)
				.borderLeftColor('#666666')
				.mount(this._rootScene);

		this.bottomBar = new IgeUiEntity()
				.id('bottomBar')
				.bottom(0)
				.right(0)
				.width('100%')
				.height(25)
				.backgroundColor('#333333')
				.borderTopWidth(1)
				.borderTopColor('#666666')
				.mount(this._rootScene);

		this.mainView = new IgeUiEntity()
				.id('mainView')
				.bottom(0)
				.right(0)
				.width('100%')
				.height(25)
				.backgroundColor('#333333')
				.borderTopWidth(1)
				.borderTopColor('#666666')
				.mount(this._rootScene);

		// CHILD OBJECTS ------------------------------------
		// TOOLBAR
		new ige.Class.ToolBarButton()
			.id('create')
			.top(0)
			.left(0)
			.width(32)
			.height(32)
			.texture(this._textures.uiButtonCreate)
			.mount(this.toolBar);

		new ige.Class.ToolBarButton()
			.id('select')
			.top(0)
			.left(32)
			.width(32)
			.height(32)
			.texture(this._textures.uiButtonSelect)
			.mount(this.toolBar);

		new ige.Class.ToolBarButton()
			.id('zoomOut')
			.top(32)
			.left(0)
			.width(32)
			.height(32)
			.texture(this._textures.uiButtonZoomOut)
			.mount(this.toolBar);

		new ige.Class.ToolBarButton()
			.id('zoomIn')
			.top(32)
			.left(32)
			.width(32)
			.height(32)
			.texture(this._textures.uiButtonZoomIn)
			.mount(this.toolBar);

		new ige.Class.ToolBarButton()
			.id('paint')
			.top(64)
			.left(0)
			.width(32)
			.height(32)
			.texture(this._textures.uiButtonPaint)
			.mount(this.toolBar);

		new ige.Class.ToolBarButton()
			.id('paintRemove')
			.top(64)
			.left(32)
			.width(32)
			.height(32)
			.texture(this._textures.uiButtonPaintRemove)
			.mount(this.toolBar);

		// BOTTOM BAR
		new IgeFontEntity()
			.id('cursorPosition')
			.texture(this._textures.fontVerdana10pt)
			.left(5)
			.middle(-0.5)
			.width(32)
			.height(20)
			.textAlignX(0)
			.textAlignY(1)
			.text('0, 0')
			.addBehaviour('updateCords', function () {
				if (ige._mouseOverVp === ige.editor._editorGameVp) {
					this.text('World: ' + ige._mouseOverVp._mousePos.x + ', ' + ige._mouseOverVp._mousePos.y);
				}
			})
			.mount(this.bottomBar);

		// RIGHT BAR
		new IgeUiTogglePanel(
			'Scene Graph Tree',
			this._textures.fontVerdana10pt,
			this._textures.arrowCircleRight,
			this._textures.arrowCircleDown
		)
			.id('sceneGraphTogglePanel')
			.top(0)
			.left(1)
			.width('100%', -1)
			.height(25)
			.mount(this.rightBar);

		new IgeUiTogglePanel(
			'Textures',
			this._textures.fontVerdana10pt,
			this._textures.arrowCircleRight,
			this._textures.arrowCircleDown
		)
			.id('texturesTogglePanel')
			.top(0)
			.left(1)
			.width('100%', -1)
			.height(27)
			.borderBottomColor('#666666')
			.backgroundColor('#222222')
			.toggleOn(function () {
				this._parent._texturePanel.height(300);
			})
			.toggleOff(function () {
				this._parent._texturePanel.height(0);
			})
			.mount(this.rightBar);

		this.rightBar._texturePanel = new this._classes.TexturePanel(40, 40)
			.top(1)
			.left(1)
			.width(250)
			.height(300)
			//.padding(5, 5, 5, 5)
			.borderBottomWidth(1)
			.borderBottomColor('#666666')
			.backgroundColor('#222222')
			.mount(this.rightBar)
			.refresh();

		// Listen for new textures
		ige.on('texturesLoaded', function () {
			ige.editor.rightBar._texturePanel.refresh();
		});

		return this;
	},

	start: function () {
		if (!this._editorVp._parent) {
			// Unmount the game's viewport
			this._gvp.unMount();

			// Mount the editor viewport to the main IGE
			this._editorVp.mount(ige);

			// Add the game's root scene to the new viewport
			// that we made to show the game scene
			this._editorGameVp
				.scene(this._grs)
				.mount(ige);
		}

		return this;
	},

	stop: function () {
		if (this._editorVp._parent) {
			this._editorVp.unMount();
			this._editorGameVp.unMount();
			this._gvp.mount(ige);
		}

		return this;
	}
});