"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeMySqlComponent', function (IgeEventingClass) {
	var IgeMySqlComponent = IgeEventingClass.extend({
		classId: 'IgeMySqlComponent',
		componentId: 'mysql',
		
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
			
			// Setup the mongo module
			this._mysql = require('../../../' + modulePath + 'mysql');
			
			// Implement the mongo methods
			this.implement(IgeMySql);
			
			// Pass the options to the settings method
			this.settings(options);
			
			this.log('Database component initiated!');
		}
	});
	
	return IgeMySqlComponent;
});