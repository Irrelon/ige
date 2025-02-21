export declare class b2StackQueue<T> {
    readonly m_buffer: Array<T | null>;
    m_front: number;
    m_back: number;
    get m_capacity(): number;
    constructor(capacity: number);
    Push(item: T): void;
    Pop(): void;
    Empty(): boolean;
    Front(): T;
}
