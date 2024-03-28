/**
 * Creates a getter/setter method on the passed `Class` via
 * its prototype. This saves us from having to constantly
 * write out the same getter/setter pattern over and over for
 * every method that follows it.
 * @param Class
 * @param methodName
 * @param shouldStreamChange
 */
export function synthesize<FunctionArgType = any> (Class: any, methodName: string, shouldStreamChange: boolean = false) {
	const privatePropertyName = `_${methodName}`;

	Class.prototype[methodName] = function (val?: FunctionArgType) {
		if (val === undefined) {
			return this[privatePropertyName];
		}

		this[privatePropertyName] = val;
		if (shouldStreamChange) {
			this.streamProperty(methodName, val);
		}
		return this;
	};
}
