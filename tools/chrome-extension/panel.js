var selectedItem;

function addToSG(item) {
	var elem = document.createElement('li'),
		arr,
		arrCount,
		i,
		mouseOver,
		mouseOut,
		mouseUp;

	mouseOver = function (event) {
		if (!selectedItem) {
			event.stopPropagation();
			//document.getElementById('igeConsole').innerHTML += "ige.$('vp1').drawBoundsLimitId('" + this.id + "');" + '<br />';
			chrome.devtools.inspectedWindow.eval("ige._children.each(function (item) { if (item.drawBoundsLimitId) { item.drawBoundsLimitId('" + this.id + "'); } });", function (result, isException) {

			});
		}
	};

	mouseOut = function (event) {
		if (!selectedItem) {
			event.stopPropagation();
			//document.getElementById('igeConsole').innerHTML += "ige.$('vp1').drawBoundsLimitId('');" + '<br />';
			chrome.devtools.inspectedWindow.eval("ige._children.each(function (item) { if (item.drawBoundsLimitId) { item.drawBoundsLimitId(''); } });", function (result, isException) {

			});
		}
	};

	mouseUp = function (event) {
		event.stopPropagation();

		$('.sgItem').removeClass('selected');
		$(this).addClass('selected');

		selectedItem = this.id;
		$('#id').html(this.id);

		chrome.devtools.inspectedWindow.eval("ige._children.each(function (item) { if (item.drawBoundsLimitId) { item.drawBoundsLimitId('" + this.id + "'); } });", function (result, isException) {

		});

		// Grab data about the object from the engine
		chrome.devtools.inspectedWindow.eval("ige.$('" + this.id + "').classId()", function (result, isException) {
			$('#classId').html(result);
		});

		chrome.devtools.inspectedWindow.eval("ige.$('" + this.id + "')._parent.id()", function (result, isException) {
			if (result) {
				$('#parentId').html(result);
			} else {
				$('#parentId').html('');
			}
		});

		chrome.devtools.inspectedWindow.eval("ige.$('" + this.id + "')._translate.x", function (result, isException) {
			$('#translateX').val(result);
		});

		chrome.devtools.inspectedWindow.eval("ige.$('" + this.id + "')._translate.y", function (result, isException) {
			$('#translateY').val(result);
		});

		chrome.devtools.inspectedWindow.eval("ige.$('" + this.id + "')._translate.z", function (result, isException) {
			$('#translateZ').val(result);
		});
	};

	//elem.addEventListener('mouseover', mouseOver, false);
	//elem.addEventListener('mouseout', mouseOut, false);
	elem.addEventListener('mouseup', mouseUp, false);

	elem.id = item.id;
	elem.innerHTML = item.text;
	elem.className = 'sgItem';

	if (!parent) {
		parent = 'sceneGraph';
	}

	document.getElementById(item.parentId + '_items').appendChild(elem);

	if (item.items) {
		// Create a ul inside the li
		elem = document.createElement('ul');
		elem.id = item.id + '_items';
		document.getElementById(item.id).appendChild(elem);

		arr = item.items;
		arrCount = arr.length;

		for (i = 0; i < arrCount; i++) {
			addToSG(arr[i]);
		}
	}
}

// Setup the dev tool tabs
$(document).ready(function () {
	// Hook the tab clicks
	$('.tab').click(function () {
		// Remove active from all tab views
		$('.tabView').removeClass('active');
		$('#tabStrip .tab').removeClass('active');
		$('#' + this.id + 'View').addClass('active');
		$(this).addClass('active');

		$('#' + this.id + 'View').height(window.innerHeight - $('#tabStrip').height());
		$('.leftPane').height(window.innerHeight - $('#tabStrip').height());
		$('.rightPane').height(window.innerHeight - $('#tabStrip').height());

		$('.leftPane').width(window.innerWidth - $('.rightPane').width());
	});

	// Hook the scenegraph refresh button
	$('#refreshSceneGraph').click(function () {
		// Store the left pane's scroll position
		var leftPaneScroll = $('.leftPane').scrollTop();

		// Clear the scenegraph data
		$('#sceneGraph_items').html('');

		chrome.devtools.inspectedWindow.eval("ige.$('vp1').drawBounds(true).drawBoundsData(true);");
		chrome.devtools.inspectedWindow.eval('ige.getSceneGraphData(ige, true);', function (result, isException) {
			addToSG(result);

			$('#igeSceneGraph').click();

			// Restore the scroll position
			$('.leftPane').scrollTop(leftPaneScroll);
		});
	});

	// Hook the transform value changes
	$('#translateX, #translateY, #translateZ').change(function () {
		chrome.devtools.inspectedWindow.eval("ige.$('" + selectedItem + "').translateTo(" + $('#translateX').val() + ", " + $('#translateY').val() + ", " + $('#translateZ').val() + ");");
	});

	// Load the scenegraph tab
	$('#refreshSceneGraph').click();
});