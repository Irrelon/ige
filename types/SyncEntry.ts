export type SyncMethod = (data: string) => void;

export interface SyncEntry {
    attrArr: string;
    method: SyncMethod;
}
