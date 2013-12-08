(function ($) {
	function generateList (listData, parent) {
		var list = $('<ul></ul>'),
			item = $('<li id="' + listData.id + '" data-classId="' + listData.classId + '"><a>' + listData.text + '</a></li>'),
			i;
		
		list.append(item);
		
		// Process list item children
		if (listData.items) {
			for (i = 0; i < listData.items.length; i++) {
				generateList(listData.items[i], item);
			}
		}
		
		if (parent) {
			parent.append(list);
		} else {
			return list;
		}
	}
	
	$.fn.tree = function (options) {
		// Build tree from data
		if (options.data) {
			this.append(generateList(options.data));
		} else {
			// Tree call with no data
			console.log('Missing tree "data" property.');
		}
		
		return this;
	};
}(jQuery));