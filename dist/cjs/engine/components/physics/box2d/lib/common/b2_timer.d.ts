export declare class b2Timer {
    m_start: number;
    Reset(): b2Timer;
    GetMilliseconds(): number;
}
export declare class b2Counter {
    m_count: number;
    m_min_count: number;
    m_max_count: number;
    GetCount(): number;
    GetMinCount(): number;
    GetMaxCount(): number;
    ResetCount(): number;
    ResetMinCount(): void;
    ResetMaxCount(): void;
    Increment(): void;
    Decrement(): void;
}
