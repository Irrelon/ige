export type IgeNetworkMessageData = any;
export type IgeNetworkEncodedMessageData = [string, IgeNetworkMessageData];
export type IgeNetworkRequestCallback = (...args: any[]) => void;
export type IgeNetworkServerSideRequestHandler = (
	data: IgeNetworkMessageData,
	clientId: string,
	requestCallback: IgeNetworkRequestCallback
) => void;
export type IgeNetworkServerSideMessageHandler = (
	data: IgeNetworkMessageData,
	clientId: string,
	requestCallback?: IgeNetworkRequestCallback
) => void;
export type IgeNetworkClientSideMessageHandler = (
	data: IgeNetworkMessageData,
	requestCallback?: IgeNetworkRequestCallback
) => void;
export type IgeNetworkClientSideResponseHandler = (...args: any[]) => void;
export type IgeNetworkTimeSyncRequestFromServer = [number];
export type IgeNetworkTimeSyncResponseFromClient = [number, number];
export type IgeNetworkServerSideResponseData = any[];

export interface IgeNetworkMessageStructure {
	id: string;
	cmd: string;
	data: IgeNetworkMessageData;
}

export interface IgeNetworkRequestMessageStructure<CallbackType> extends IgeNetworkMessageStructure {
	clientId?: string;
	callback: CallbackType;
	timestamp: number;
}
