export declare class ThreadSafeQueue<DataType> {
    _queue: DataType[];
    _add: DataType[];
    _remove: DataType[];
    addItem(item: DataType): void;
    removeItem(item: DataType): void;
    getIndex(index: number): DataType;
    length(): number;
    update(): void;
}
