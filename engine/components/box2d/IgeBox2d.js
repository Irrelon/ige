var IgeBox2dComponent = IgeClass.extend({
	classId: 'IgeBox2dComponent',
	componentId: 'box2d',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		if (!ige.isServer) {
			this.b2Color = Box2D.Common.b2Color;
			this.b2Vec2 = Box2D.Common.Math.b2Vec2;
			this.b2Math = Box2D.Common.Math.b2Math;
			this.b2Shape = Box2D.Collision.Shapes.b2Shape;
			this.b2BodyDef = Box2D.Dynamics.b2BodyDef;
			this.b2Body = Box2D.Dynamics.b2Body;
			this.b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
			this.b2Fixture = Box2D.Dynamics.b2Fixture;
			this.b2World = Box2D.Dynamics.b2World;
			this.b2MassData = Box2D.Collision.Shapes.b2MassData;
			this.b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
			this.b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
			this.b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
			this.b2ContactListener = Box2D.Dynamics.b2ContactListener;
			this.b2Distance = Box2D.Collision.b2Distance;
		}

		this._sleep = true;
		this._scaleRatio = 30;
		this._gravity = new this.b2Vec2(0, 0);
	},

	/**
	 * Gets / sets if the world should allow sleep or not.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	sleep: function (val) {
		if (val !== undefined) {
			this._sleep = val;
			return this._entity;
		}

		return this._sleep;
	},

	/**
	 * Gets / sets the current engine to box2d scaling ratio.
	 * @param val
	 * @return {*}
	 */
	scaleRatio: function (val) {
		if (val !== undefined) {
			this._scaleRatio = val;
			return this._entity;
		}

		return this._scaleRatio;
	},

	/**
	 * Gets / sets the gravity vector.
	 * @param val
	 * @return {*}
	 */
	gravity: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._gravity = new this.b2Vec2(x, y);
			return this._entity;
		}

		return this._gravity;
	},

	createWorld: function () {
		this._world = new this.b2World(
			this._gravity,
			this._sleep
		);

		return this._entity;
	},

	createBody: function (body) {
		var tempDef = new this.box2d.b2BodyDef();

		// Add the body to the world with the passed fixture
		return this._world.CreateBody(tempDef);
	}
});