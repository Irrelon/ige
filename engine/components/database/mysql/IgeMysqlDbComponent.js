var IgeMySqlDbComponent = IgeEventingClass.extend({
	classId: 'IgeMySqlDbComponent',
	componentId: 'mysql',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Setup the mongo module
		this._mysql = require('../../../' + modulePath + 'mysql');

		// Implement the mongo methods
		this.implement(IgeMySqlDb);

		// Pass the options to the settings method
		this.settings(options);

		this.log('Database component initiated!');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMySqlDbComponent; }