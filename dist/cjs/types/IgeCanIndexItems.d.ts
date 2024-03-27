export interface IgeCanIndexItems<ValueType = any> {
    encodeHash: (location: number[]) => string;
    decodeHash: (hash: string) => number[];
    set: (value: ValueType, location: number[]) => boolean;
    remove: (value: ValueType) => boolean;
    getValues: (hash: string) => ValueType[];
}
