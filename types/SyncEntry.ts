export interface SyncEntry {
    attrArr: string[];
    method: (data: string[]) => void;
}
