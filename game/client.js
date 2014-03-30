var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		//ige.timeScale(0.1);
		ige.showStats(1);
        ige.globalSmoothing(true);

		// Load our textures
		var self = this;
        self.networkStarted = false;

        this.implement(ClientNetworkEvents);

		// Enable networking
		ige.addComponent(IgeNetIoComponent);

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Load the textures we want to use
		this.textures = {
			logo: new IgeTexture('./assets/logo.png'),
            loginButton: new IgeTexture('./assets/loginButton.png')
		};

		ige.on('texturesLoaded', function () {
			// Ask the engine to start
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {

                    // apply all the "css" biz
                    self.setUiStyles();

                    self.baseScene = new IgeScene2d()
                        .id('baseScene');

                    self.vp1 = new IgeViewport()
                        .id('vp1')
                        .autoSize(true)
                        .scene(self.baseScene)
                        .drawBounds(false)
                        .mount(ige);

                    self.uiScene = new IgeScene2d()
                        .id('uiScene')
                        .depth(1)
                        .ignoreCamera(true)
                        .mount(self.baseScene);

                    self.mainDiv = new IgeUiElement()
                        .id('mainDiv')
                        .styleClass('main')
                        .mount(self.uiScene);

                    self.loginDiv = new IgeUiElement()
                        .id('loginDiv')
                        .styleClass('loginDiv')
                        .mount(self.mainDiv);

                    self.tbUsername = new IgeUiTextBox()
                        .id('tbUsername')
                        .value('')
                        .placeHolder('Username')
                        .placeHolderColor('#989898')
                        .mount(self.loginDiv);

                    self.tbPassword = new IgeUiTextBox()
                        .id('tbPassword')
                        .value('')
                        .mask('*')
                        .placeHolder('Password')
                        .placeHolderColor('#989898')
                        .mount(self.loginDiv);

                    self.btnLogin = new IgeUiElement()
                        .id('btnLogin')
                        .texture(self.textures.loginButton)
                        .dimensionsFromTexture()
                        .mouseUp(function(){
                            //ToDo
                            var username = self.tbUsername.value(),
                                password = self.tbPassword.value();
                            if (username.length > 2 && password.length > 2) {
                                ige.network.start('http://localhost:2000', function () {


                                    ige.network.define('onDbTest', self._onDbTest);

                                    self.networkStarted = true;
					            });

                                if (self.networkStarted) {
                                    console.log('networking started, trying db connection...');
                                    ige.network.send('onDbTest', { username: username, password: password });
                                    console.log('sent!');
                                }
                            }
                        })
                        .mount(self.loginDiv);

                    self.logo = new IgeUiElement()
                        .id('logo')
                        .texture(self.textures.logo)
                        .dimensionsFromTexture(30) // argument = % of original size
                        .mount(self.loginDiv);

					// Start the networking (you can do this elsewhere if it
					// makes sense to connect to the server later on rather
					// than before the scene etc are created... maybe you want
					// a splash screen or a menu first? Then connect after you've
					// got a username or something?
//					ige.network.start('http://localhost:2000', function () {
//						// Setup the network stream handler
//					});
				}
			});
		});
	},

    setUiStyles: function() {

        ige.ui.style('IgeUiLabel', {
            'font': '14px Open Sans',
            'color': '#333333'
        });

        ige.ui.style('IgeUiTextBox', {
            'backgroundColor': '#ffffff',
            'borderColor': '#212121',
            'borderWidth': 1,
            'borderRadius': 4,
            'bottom': null,
            'right': null,
            'width': 200,
            'height': 30,
//            'left': '50%',
            'font': '12px Open Sans',
            'color': '#000000'
        });

        ige.ui.style('.main', {
            'backgroundColor': '#dddddd',
            'top': 0,
            'left': 0,
            'width': '100%',
            'height': '100%'
        });

        ige.ui.style('.loginDiv', {
            'backgroundColor': '#eee',
            'width': 400,
            'height': 250,
            'borderWidth': 1,
            'borderColor': '#212121'
        });

        ige.ui.style('#btnLogin', {
            'bottom': 20,
            'right': '50%'
        });

        ige.ui.style('#logo', {
            'top': 10,
//            'left': 0
        });

        ige.ui.style('#tbUsername', {
            'top': '42%'
        });

        ige.ui.style('#tbPassword', {
            'top': '58%'
        });


    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }