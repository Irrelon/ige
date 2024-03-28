/**
 * Creates a getter/setter method on the passed `Class` via
 * its prototype. This saves us from having to constantly
 * write out the same getter/setter pattern over and over for
 * every method that follows it.
 * @param Class
 * @param methodName
 * @param shouldStreamChange
 */
export declare function synthesize<FunctionArgType = any>(Class: any, methodName: string, shouldStreamChange?: boolean): void;
