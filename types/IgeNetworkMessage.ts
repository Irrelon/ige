export type IgeNetworkMessageData = any[];
export type IgeNetworkEncodedMessageData = [string, IgeNetworkMessageData];
export type IgeNetworkMessageHandler = (data: IgeNetworkMessageData, clientId?: string, requestId?: string) => void;
export type IgeNetworkServerTimeSyncRequest = [number];
export type IgeNetworkClientTimeSyncResponse = [number, number];

export interface IgeNetworkRequestMessageStructure<CallbackType> {
    clientId?: string;
    id: string;
    cmd: string;
    data: IgeNetworkMessageData;
    callback: CallbackType;
    timestamp: number;
}

export interface IgeNetworkMessageStructure {
    id: string;
    cmd: string;
    data: IgeNetworkMessageData;
}