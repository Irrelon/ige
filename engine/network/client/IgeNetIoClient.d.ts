import { IgeEventingClass } from "../../core/IgeEventingClass";
export interface IgeNetIoClientOptions {
    connectionRetry: boolean;
    connectionRetryMax: number;
    reconnect: boolean;
}
export declare class IgeNetIoClient extends IgeEventingClass {
    classId: string;
    _networkId?: string;
    _options?: IgeNetIoClientOptions;
    _state: number;
    _debug: boolean;
    _connectionAttempts: number;
    _socket: WebSocket | null;
    _disconnectReason?: string;
    constructor(url?: string, options?: IgeNetIoClientOptions);
    /**
     * Gets / sets the debug flag. If set to true, net.io
     * will output debug data about every network event as
     * it occurs to the console.
     * @param {Boolean=} val
     * @return {*}
     */
    debug(val?: boolean): boolean | this;
    connect(url: string): void;
    disconnect(reason?: string): void;
    send(data: any): void;
    _onOpen: () => void;
    _onData: (evt: MessageEvent<any>) => void;
    _onClose: (evt: CloseEvent) => void;
    _onError: (evt: Event) => void;
    _encode(data: any): string;
    _decode(data: string): any;
}
