var appCore = require('../../../ige');

require('./Ship');
require('./Target');
require('./Inventory');

appCore.module('PlayerShip', function ($ige, $game, Ship, Target, Inventory) {
	var PlayerShip = Ship.extend({
		classId: 'PlayerShip',
		
		init: function (publicGameData) {
			Ship.prototype.init.call(this, publicGameData);
			
			var self = this;
			self.drawBounds(false);
			self.clientId(publicGameData.clientId);
			
			self._controls = [];
			self._controlState = {
				left: false,
				right: false,
				thrust: false,
				reverse: false,
				braking: false
			};
			
			self._inventory = new Inventory();
			
			/* CEXCLUDE */
			if ($ige.isServer) {
				self.log('Server-side init...');
			}
			/* CEXCLUDE */
			
			if (!$ige.isServer) {
				// Define our client-side player keyboard controls
				self.addControl('left', [$ige.engine.input.key.left, $ige.engine.input.key.a]);
				self.addControl('right', [$ige.engine.input.key.right, $ige.engine.input.key.d]);
				self.addControl('thrust', [$ige.engine.input.key.up, $ige.engine.input.key.w]);
				self.addControl('reverse', [$ige.engine.input.key.down, $ige.engine.input.key.s]);
				self.addControl('braking', $ige.engine.input.key.space);
			}
			
			self._thrustPower = 1.5;
			self._reversePower = 1.5;
			
			if (!$ige.isServer) {
				self.target = new Target();
			}
		},
		
		/* CEXCLUDE */
		clientId: function (clientId) {
			if (clientId !== undefined) {
				this._clientId = clientId;
				return this;
			}
			
			return this._clientId;
		},
		/* CEXCLUDE */
		
		addControl: function (name, codes) {
			$ige.engine.input.mapAction(name, codes);
			this._controls.push(name);
		},
		
		selectTarget: function (target) {
			if (target === null) {
				this.target._targetEntity = undefined;
				return;
			}
			
			this.target._targetEntity = target;
			this.target
				.translateTo(target._translate.x, target._translate.y, 0);
		},
		
		/**
		 * Called every frame by the engine when this entity is mounted to the
		 * scenegraph.
		 * @param ctx The canvas context to render to.
		 */
		update: function (ctx, tickDelta) {
			/* CEXCLUDE */
			if ($ige.isServer) {
				this._updatePhysics();
			}
			/* CEXCLUDE */
			
			if ($ige.isClient) {
				// Loop the controls and check for a state change
				this._updateInputs();
				
				// Update target display
				this._updateTarget();
			}
			
			// Call the IgeEntity (super-class) tick() method
			Ship.prototype.update.call(this, ctx, tickDelta);
			
			if ($ige.isClient && $game.playerEntity === this) {
				// Update UI elements
				$game.scene.stateBar.fuel
					.min(this._publicGameData.state.fuel.min)
					.max(this._publicGameData.state.fuel.max)
					.progress(this._publicGameData.state.fuel.val);
				
				$game.scene.stateBar.energy
					.min(this._publicGameData.state.energy.min)
					.max(this._publicGameData.state.energy.max)
					.progress(this._publicGameData.state.energy.val);
				
				$game.scene.stateBar.shield
					.min(this._publicGameData.state.shield.min)
					.max(this._publicGameData.state.shield.max)
					.progress(this._publicGameData.state.shield.val);
				
				$game.scene.stateBar.integrity
					.min(this._publicGameData.state.integrity.min)
					.max(this._publicGameData.state.integrity.max)
					.progress(this._publicGameData.state.integrity.val);
				
				$game.scene.stateBar.inventorySpace
					.min(0)
					.max(this._publicGameData.state.inventorySpace.val)
					.progress(this._publicGameData.state.inventoryCount.val);
			}
		},
		
		_updatePhysics: function () {
			var radians,
				thrustVector,
				thrusting = false;
			
			if (this._controlState.left && this._controlState.right) {
				this._box2dBody.SetAngularVelocity(0);
			} else {
				if (this._controlState.left) {
					this._box2dBody.SetAngularVelocity(-2.5);
					this._box2dBody.SetAwake(true);
				}
				
				if (this._controlState.right) {
					this._box2dBody.SetAngularVelocity(2.5);
					this._box2dBody.SetAwake(true);
				}
			}
			
			if (!this._controlState.left && !this._controlState.right) {
				this._box2dBody.SetAngularVelocity(0);
			}
			
			if (this._controlState.thrust) {
				radians = this._rotate.z + Math.radians(-90);
				thrustVector = new $ige.engine.box2d.b2Vec2(Math.cos(radians) * this._thrustPower, Math.sin(radians) * this._thrustPower);
				
				this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
				this._box2dBody.SetAwake(true);
				
				thrusting = true;
			}
			
			if (this._controlState.reverse) {
				radians = this._rotate.z + Math.radians(-270);
				thrustVector = new $ige.engine.box2d.b2Vec2(Math.cos(radians) * this._reversePower, Math.sin(radians) * this._reversePower);
				
				this._box2dBody.ApplyForce(thrustVector, this._box2dBody.GetWorldCenter());
				this._box2dBody.SetAwake(true);
				
				thrusting = true;
			}
			
			this.streamProperty('thrusting', thrusting);
			
			if (this._controlState.braking) {
				// Apply damping force until stopped
				this._box2dBody.SetLinearDamping(this._publicGameData.state.linearDamping.max);
			} else {
				this._box2dBody.SetLinearDamping(this._publicGameData.state.linearDamping.min);
			}
		},
		
		_updateInputs: function () {
			var arr = this._controls,
				arrCount = arr.length,
				arrIndex,
				control;
			
			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				control = arr[arrIndex];
				
				if ($ige.engine.input.actionState(control)) {
					if (!this._controlState[control]) {
						// Record the new state
						this._controlState[control] = true;
						
						// Tell the server about our control change
						$ige.engine.network.send('playerShipControlChange', [control, true]);
					}
				} else {
					if (this._controlState[control]) {
						// Record the new state
						this._controlState[control] = false;
						
						// Tell the server about our control change
						$ige.engine.network.send('playerShipControlChange', [control, false]);
					}
				}
			}
		},
		
		_updateTarget: function () {
			if (this.target && this.target._targetEntity) {
				this.target._distance = this.distanceTo(this.target._targetEntity);
				
				ige.$('targetDistance')
					.value('Distance: ' + this.target._distance.toFixed(2) + ' km');
				
				$game.scene.targetInfo.show();
			} else {
				$game.scene.targetInfo.hide();
			}
		}
	});
	
	return PlayerShip;
});