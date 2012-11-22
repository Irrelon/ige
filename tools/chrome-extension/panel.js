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
			chrome.devtools.inspectedWindow.eval("ige.$('vp1').drawBoundsLimitId('" + this.id + "');", function (result, isException) {

			});
		}
	};

	mouseOut = function (event) {
		if (!selectedItem) {
			event.stopPropagation();
			//document.getElementById('igeConsole').innerHTML += "ige.$('vp1').drawBoundsLimitId('');" + '<br />';
			chrome.devtools.inspectedWindow.eval("ige.$('vp1').drawBoundsLimitId('');", function (result, isException) {

			});
		}
	};

	mouseUp = function () {
		var arr = document.getElementsByClassName('sgItem'),
			arrCount = arr.length,
			i;

		for (i = 0; i < arrCount; i++) {
			arr[i].className = 'sgItem';
		}

		event.stopPropagation();
		selectedItem = this.id;
		this.className = 'sgItem selected';
		chrome.devtools.inspectedWindow.eval("ige.$('vp1').drawBoundsLimitId('" + this.id + "');", function (result, isException) {

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

chrome.devtools.inspectedWindow.eval("ige.$('vp1').drawBounds(true).drawBoundsData(true);");
chrome.devtools.inspectedWindow.eval('ige.getSceneGraphData(ige, true);', function (result, isException) {
	addToSG(result);
});