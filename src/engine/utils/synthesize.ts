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
