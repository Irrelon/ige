"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeNetworkConnectionState = void 0;
var IgeNetworkConnectionState;
(function (IgeNetworkConnectionState) {
    IgeNetworkConnectionState[IgeNetworkConnectionState["disconnected"] = 0] = "disconnected";
    IgeNetworkConnectionState[IgeNetworkConnectionState["connecting"] = 1] = "connecting";
    IgeNetworkConnectionState[IgeNetworkConnectionState["connected"] = 2] = "connected";
    IgeNetworkConnectionState[IgeNetworkConnectionState["ready"] = 3] = "ready";
})(IgeNetworkConnectionState || (exports.IgeNetworkConnectionState = IgeNetworkConnectionState = {}));
