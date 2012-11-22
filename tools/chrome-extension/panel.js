function addToSG(item) {
	var elem = document.createElement('li'),
		arr,
		arrCount,
		i;

	elem.id = item.id;
	elem.innerHTML = item.text;

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

chrome.devtools.inspectedWindow.eval('ige.getSceneGraphData(ige, true);', function (result, isException) {
	addToSG(result);
});