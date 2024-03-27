/**
 * Sets a trace up on the setter of the passed object's
 * specified property. When the property is set by any
 * code the debugger line is activated and code execution
 * will be paused allowing you to step through code or
 * examine the call stack to see where the property set
 * originated.
 * @param {Object} obj The object whose property you want
 * to trace.
 * @param {string} propName The name of the property you
 * want to put the trace on.
 * @param {number} sampleCount The number of times you
 * want the trace to break with the debugger line before
 * automatically switching off the trace.
 * @param {Function=} callbackEvaluator Optional callback
 * that if returns true, will fire debugger. Method is passed
 * the setter value as first argument.
 */
export declare const traceSet: (obj: any, propName: string, sampleCount: number, callbackEvaluator?: ((val: any) => boolean) | undefined) => void;
/**
 * Turns off a trace that was created by calling traceSet.
 * @param {Object} obj The object whose property you want
 * to disable a trace against.
 * @param {string} propName The name of the property you
 * want to disable the trace for.
 */
export declare const traceSetOff: (obj: any, propName: string) => void;
