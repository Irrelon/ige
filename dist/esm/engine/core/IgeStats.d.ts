export type IgeStatsTemporalData = Record<string, Record<string, Record<string, Record<string, number>>>>;
export declare class IgeStats {
    _start: Record<string, number>;
    _duration: Record<string, number>;
    _lastDuration: Record<string, number>;
    start(classId: string, objId: string, funcName: string, statType: string): number;
    end(classId: string, objId: string, funcName: string, statType: string, cumulative?: boolean): number;
    cutOff(): void;
    toObject(threshold?: number): IgeStatsTemporalData;
}
