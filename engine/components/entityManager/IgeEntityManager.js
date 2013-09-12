var IgeEntityManager = IgeEventingClass.extend({
	classId: 'IgeEntityManager',
	componentId: 'entityManager',
	
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;
		
		// Create queue arrays that will store entities waiting to
		// be mounted or unmounted
		this._mountQueue = [];
		this._unMountQueue = [];
		this._maxMountsPerOp = 0;
		this._maxUnMountsPerOp = 0;
			
		// Create the _orphans array on the entity
		entity._orphans = [];
		
		// Set a method (behaviour) that will be called on every update
		entity.addBehaviour('path', this._updateBehaviour, false);
	},
	
	_updateBehaviour: function () {
		// Get our instance back
		var self = this.entityManager;
		
		self._updateOrphans();
		self._updateChildren();
		
		self._processMountQueue();
		self._processUnMountQueue();
	},
	
	_updateOrphans: function () {
		// Loop our child entities and check for new orphans (entities that are
		// set to managed and are not intersecting the bounds of any active viewport
		var arr = this._entity._children,
			arrCount = arr.length,
			// TODO: This does not currently support multiple viewports
			vpViewArea = ige._currentViewport.viewArea(),
			item;
		
		while (arrCount--) {
			item = arr[arrCount];

			if (item._managed) {
				if (item.aabb) {
					// Check the entity to see if its bounds are "inside" the
					// viewport's visible area
					if (!vpViewArea.rectIntersect(item.aabb(true))) {
						// The entity is not inside the viewport visible area
						this._unMountQueue.push(item);
					}
				} else {
					this._unMountQueue.push(item);
				}
			}
		}
	},
	
	_updateChildren: function () {
		// Loop our child entities and check for new orphans (entities that are
		// set to managed and are not intersecting the bounds of any active viewport
		var arr = this._entity._orphans,
			arrCount = arr.length,
			// TODO: This does not currently support multiple viewports
			vpViewArea = ige._currentViewport.viewArea(),
			item;
		
		while (arrCount--) {
			item = arr[arrCount];

			if (item._managed) {
				if (item.aabb) {
					// Check the entity to see if its bounds are "inside" the
					// viewport's visible area
					if (vpViewArea.rectIntersect(item.aabb())) {
						// The entity is not inside the viewport visible area
						this._mountQueue.push(item);
					}
				}
			}
		}
	},
	
	_processMountQueue: function () {
		var arr = this._mountQueue,
			arrCount = arr.length,
			item;
		
		while (arrCount--) {
			item = arr[arrCount];
			
			this._entity._orphans.pull(item);
			item.mount(this._entity);
		}
		
		this._mountQueue = [];
	},
	
	_processUnMountQueue: function () {
		var arr = this._unMountQueue,
			arrCount = arr.length,
			item;
		
		while (arrCount--) {
			item = arr[arrCount];
			item.unMount();
			
			this._entity._orphans.push(item);
		}
		
		this._unMountQueue = [];
	}
});