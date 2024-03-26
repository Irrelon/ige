let _idCounter = 0;

/**
 * Generates a new unique ID as a number.
 * @return {number}
 */
export const newIdNumber = (): number => {
	_idCounter++;
	return (
		_idCounter +
		(Math.random() * Math.pow(10, 17) +
			Math.random() * Math.pow(10, 17) +
			Math.random() * Math.pow(10, 17) +
			Math.random() * Math.pow(10, 17))
	);
};

/**
 * Generates a new unique ID string
 * @return {string}
 */
export const newId = (): string => {
	_idCounter++;
	return newIdNumber().toString();
};

/**
 * Generates a new 16-character hexadecimal unique ID
 * @return {string}
 */
export const newIdHex = () => {
	return newIdNumber().toString(16);
};
