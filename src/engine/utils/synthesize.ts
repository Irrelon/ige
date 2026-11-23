/**
 * Creates a getter/setter method on the passed `Class` via
 * its prototype. This saves us from having to constantly
 * write out the same getter/setter pattern over and over for
 * every method that follows it.
 * @param Class
 * @param methodName
 */
export function synthesize<FunctionArgType = any> (Class: any, methodName: string) {
	const privatePropertyName = `_${methodName}`;

	Class.prototype[methodName] = function (val?: FunctionArgType) {
		if (val === undefined) {
			return this[privatePropertyName];
		}

		this[privatePropertyName] = val;
		return this;
	};
}
