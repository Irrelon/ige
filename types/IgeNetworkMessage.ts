export type IgeNetworkMessageData = any[];
export type IgeNetworkMessageHandler = (data: IgeNetworkMessageData, clientId: string) => void;
export interface IgeNetworkRequestMessageData {
    id: string;
    cmd: string;
    data: any;
    callback: IgeNetworkMessageHandler;
    timestamp: number;
}
export interface IgeNetworkRequestMessageData {
    id: string;
    cmd: string;
    data: any;
}