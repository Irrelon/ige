var IgeMongoDbComponent = IgeEventingClass.extend({
	classId: 'IgeMongoDbComponent',
	componentId: 'mongo',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Setup the mongo module
		this._mongo = {};
		this._mongo.Db = require('../../../' + modulePath + 'mongodb').Db;
		this._mongo.Connection = require('../../../' + modulePath + 'mongodb').Connection;
		this._mongo.Server = require('../../../' + modulePath + 'mongodb').Server;
		this._mongo.BSON = this._mongo.Db.bson_serializer;

		// Implement the mongo methods
		this.implement(IgeMongoDb);

		// Pass the options to the settings method
		this.settings(options);

		this.log('Database component initiated!');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMongoDbComponent; }