var IgeStreamComponent = IgeClass.extend({
	classId: 'IgeStreamComponent',
	componentId: 'stream',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;
	},

	/**
	 * Called when the client receives data from the stream system.
	 * Handles decoding the data and calling the relevant entity
	 * _onStreamData() methods.
	 * @param data
	 * @private
	 */
	_onStreamData: function (data) {
		//console.log(data);

		// Read the packet data into variables
		var clientTime = new Date().getTime(),
			time = clientTime - 20, // Simulate 20ms lag

			idSection, idArr, entityId, parentId, classId, entity, parent,

			sectionArr,

			sectionDataArr = data.split('|'),
			sectionDataCount = sectionDataArr.length,

			sectionIndex;

		// The first data section is always the entity ID and class name
		// so extract those from the section array
		idSection = sectionDataArr.shift();

		// Split the id section into individual parts
		idArr = idSection.split(',');
		entityId = idArr[0];
		parentId = idArr[1];
		classId = idArr[2];

		// Check that the entity parent exists
		parent = ige.$(parentId);

		if (parent) {
			// Check if the entity with this ID currently exists
			entity = ige.$(entityId);

			if (!entity) {
				// The entity does not currently exist so create it!
				entity = new igeClassStore[classId]()
					.id(entityId)
					.mount(parent);
			}

			// Get the entity stream section array
			sectionArr = entity._streamSections;

			// Now loop the data sections array and compile the rest of the
			// data string from the data section return data
			for (sectionIndex = 0; sectionIndex < sectionDataCount; sectionIndex++) {
				// Tell the entity to handle this section's data
				entity.streamSectionData(sectionArr[sectionIndex], sectionDataArr[sectionIndex]);
			}
		}
		return;

		while (count--) {
			finalDataObject = {};
			dataItem = entityMsgArray[count].split(',');

			entity = this.ige.entities.byId[dataItem[0]];
			if (entity) {
				// Only add the update to the queue if it was sent after
				// the latest update time
				if (!entity._latestUpdate) { entity._latestUpdate = 0; }
				if (typeof(entity._targetData) == 'undefined') { entity._targetData = []; }
				if (entity._latestUpdate < time) {
					finalDataObject._transform = [];
					// translate
					finalDataObject._transform[0] = parseFloat(dataItem[1]);
					finalDataObject._transform[1] = parseFloat(dataItem[2]);
					// scale
					finalDataObject._transform[3] = parseFloat(dataItem[3]);
					finalDataObject._transform[4] = parseFloat(dataItem[4]);
					// rotate
					finalDataObject._transform[6] = parseFloat(dataItem[5]);
					// origin
					finalDataObject._transform[9] = parseFloat(dataItem[6]);
					finalDataObject._transform[10] = parseFloat(dataItem[7]);
					// opacity
					finalDataObject._transform[12] = parseFloat(dataItem[8]);

					// We add this.ige.time.serverTimeDiff to the packet's time to convert
					// from the server's clock time to the clients
					entity._targetData.push([time + this.ige.time.totalServerToClientClockLatency, finalDataObject]);
					entity._nextTarget = new Date().getTime() + this._streamInterval;
				}
			}
		}
	}
});