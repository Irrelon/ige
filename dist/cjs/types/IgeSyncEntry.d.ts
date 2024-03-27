export type IgeSyncMethod = (...args: any[]) => void;
export interface IgeSyncEntry {
    attrArr: any[];
    method: IgeSyncMethod;
}
