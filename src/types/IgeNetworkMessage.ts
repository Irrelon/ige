export type IgeNetworkMessageData = any;
export type IgeNetworkEncodedMessageData = [string, IgeNetworkMessageData];
export type IgeNetworkRequestCallback<NetworkMessageResponseDataType = IgeNetworkMessageData> = (responseData: NetworkMessageResponseDataType) => void;
export type IgeNetworkServerSideRequestHandler<NetworkMessageRequestDataType = IgeNetworkMessageData, NetworkMessageResponseDataType = IgeNetworkMessageData> = (
	data: NetworkMessageRequestDataType,
	clientId: string,
	requestCallback: IgeNetworkRequestCallback<NetworkMessageResponseDataType>
) => void;
export type IgeNetworkServerSideMessageHandler<NetworkMessageDataType = IgeNetworkMessageData> = (
	data: NetworkMessageDataType,
	clientId: string,
	requestCallback?: IgeNetworkRequestCallback
) => void;
export type IgeNetworkClientSideMessageHandler<NetworkMessageDataType = IgeNetworkMessageData> = (
	data: NetworkMessageDataType,
	requestCallback?: IgeNetworkRequestCallback
) => void;
export type IgeNetworkClientSideResponseHandler = (...args: any[]) => void;
export type IgeNetworkTimeSyncRequestFromServer = [number];
export type IgeNetworkTimeSyncResponseFromClient = [number, number];

export interface IgeNetworkMessageStructure<NetworkMessageDataType = IgeNetworkMessageData> {
	id: string;
	cmd: string;
	data: NetworkMessageDataType;
}

export interface IgeNetworkRequestMessageStructure<CallbackType> extends IgeNetworkMessageStructure {
	clientId?: string;
	callback: CallbackType;
	timestamp: number;
}
