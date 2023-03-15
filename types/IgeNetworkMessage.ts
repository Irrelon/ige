export type IgeNetworkMessageData = any;
export type IgeNetworkEncodedMessageData = [string, IgeNetworkMessageData];
export type IgeNetworkServerSideMessageHandler = (data: IgeNetworkMessageData, clientId: string, requestCallback?: (responseErr: any, responseData: any) => void) => void;
export type IgeNetworkClientSideMessageHandler = (data: IgeNetworkMessageData, requestCallback?: (responseErr: any, responseData: any) => void) => void;
export type IgeNetworkClientSideResponseHandler = (...args: any[]) => void;
export type IgeNetworkTimeSyncRequestFromServer = [number];
export type IgeNetworkTimeSyncResponseFromClient = [number, number];
export type IgeNetworkServerSideResponseData = any[];

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

export interface IgeNetworkChatFromServerMessageStructure {
    roomId: string;
    text: string;
    from: string;
    to: string;
}

export interface IgeNetworkChatFromClientMessageStructure {
    roomId: string;
    text: string;
    to: string;
}
