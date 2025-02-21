export declare const IgeUndefinedVoidOnly: unique symbol;
export type IgeDestructorFunction = () => Promise<void | {
    [IgeUndefinedVoidOnly]: never;
}>;
