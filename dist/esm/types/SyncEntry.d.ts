export type SyncMethod = (...args: any[]) => void;
export interface SyncEntry {
	attrArr: any[];
	method: SyncMethod;
}
