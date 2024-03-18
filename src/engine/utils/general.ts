/**
 * Checks if the
 * property values of this object are equal to the property values
 * of the passed object. If they are the same then this method will
 * return true. Objects must not contain circular references!
 * @param {Object} obj1 The first object to compare to.
 * @param {Object} obj2 The other object to compare to.
 * @return {boolean}
 */
export const theSameAs = (obj1: any, obj2: any): boolean => {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
};

/**
 * Iterates through an array's items and calls each item's
 * destroy() method if it exists. Useful for destroying an
 * array of IgeEntity instances.
 */
export const destroyAll = (arr: any[]) => {
	const arrCount = arr.length;

	for (let i = arrCount - 1; i >= 0; i--) {
		if (typeof arr[i].destroy === "function") {
			arr[i].destroy();
		}
	}
};

/**
 * Returns a promise that resolves in the given milliseconds.
 * @param ms
 */
export const delay = (ms: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

/**
 * Gets the bounding rectangle for the passed HTML element.
 * Uses DOM methods.
 */
export const getElementPosition = (elem?: HTMLElement) => {
	if (!elem) {
		return {
			top: 0,
			left: 0
		};
	}

	try {
		return elem.getBoundingClientRect();
	} catch (e) {
		return {
			top: elem.offsetTop,
			left: elem.offsetLeft
		};
	}
};
