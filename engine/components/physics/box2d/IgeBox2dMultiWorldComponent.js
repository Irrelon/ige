/**
 * The engine's box2d multi-world component class.
 */
var IgeBox2dMultiWorldComponent = IgeEventingClass.extend({
	classId: 'IgeBox2dMultiWorldComponent',
	componentId: 'box2d',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;
		
		this._worlds = {};

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
		this.b2Contact = Box2D.Dynamics.Contacts.b2Contact;
		this.b2FilterData = Box2D.Dynamics.b2FilterData;
		this.b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;

		// Extend the b2Contact class to allow the IGE entity accessor
		// and other helper methods
		this.b2Contact.prototype.igeEntityA = function () {
			var ent = this.m_fixtureA.m_body._entity;
			ent._box2dOurContactFixture = this.m_fixtureA;
			ent._box2dTheirContactFixture = this.m_fixtureB;
			return ent;
		};

		this.b2Contact.prototype.igeEntityB = function () {
			var ent = this.m_fixtureB.m_body._entity;
			ent._box2dOurContactFixture = this.m_fixtureB;
			ent._box2dTheirContactFixture = this.m_fixtureA;
			return ent;
		};

		this.b2Contact.prototype.igeEitherId = function (id1, id2) {
			if (!id2) {
				return this.m_fixtureA.m_body._entity._id === id1 || this.m_fixtureB.m_body._entity._id === id1;
			} else {
				return (this.m_fixtureA.m_body._entity._id === id1 || this.m_fixtureB.m_body._entity._id === id1) &&
					(this.m_fixtureA.m_body._entity._id === id2 || this.m_fixtureB.m_body._entity._id === id2);
			}
		};

		this.b2Contact.prototype.igeEitherCategory = function (category1, category2) {
			if (!category2) {
				return this.m_fixtureA.m_body._entity._category === category1 || this.m_fixtureB.m_body._entity._category === category1;
			} else {
				return (this.m_fixtureA.m_body._entity._category === category1 || this.m_fixtureB.m_body._entity._category === category1) &&
					(this.m_fixtureA.m_body._entity._category === category2 || this.m_fixtureB.m_body._entity._category === category2);
			}
		};

		this.b2Contact.prototype.igeBothCategories = function (category1) {
			return (this.m_fixtureA.m_body._entity._category === category1 && this.m_fixtureB.m_body._entity._category === category1);
		};

		this.b2Contact.prototype.igeEntityByCategory = function (category) {
			if (this.m_fixtureA.m_body._entity._category === category) {
				return this.igeEntityA();
			}

			if (this.m_fixtureB.m_body._entity._category === category) {
				return this.igeEntityB();
			}
		};

		this.b2Contact.prototype.igeEntityById = function (id) {
			if (this.m_fixtureA.m_body._entity._id === id) {
				return this.igeEntityA();
			}

			if (this.m_fixtureB.m_body._entity._id === id) {
				return this.igeEntityB();
			}
		};

		this.b2Contact.prototype.igeEntityByFixtureId = function (id) {
			if (this.m_fixtureA.igeId === id) {
				return this.igeEntityA();
			}

			if (this.m_fixtureB.igeId === id) {
				return this.igeEntityB();
			}
		};

		this.b2Contact.prototype.igeOtherEntity = function (entity) {
			if (this.m_fixtureA.m_body._entity === entity) {
				return this.igeEntityB();
			} else {
				return this.igeEntityA();
			}
		};

		this.log('Physics component initiated!');
	},

	/**
	 * Gets the Box2d world object by it's id.
	 * @return {b2World}
	 */
	world: function (id) {
		return this._worlds[id];
	},

	/**
	 * Creates the Box2d world.
	 * @param {String} id
	 * @param {Object=} options
	 * @return {*}
	 */
	createWorld: function (options) {
		var world;
		
		options = options || {};
		options.id = options.id || ige.newIdHex();
		options.gravity = options.gravity || new this.b2Vec2(0, 0);
		options.sleep = options.sleep !== undefined ? options.sleep : true;
		
		// Create world instance
		this._worlds[options.id] = world = new IgeBox2dWorld(this, options);
		
		return world;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeBox2dMultiWorldComponent; }