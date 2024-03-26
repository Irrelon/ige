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
