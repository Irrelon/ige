import { IgeSceneGraph } from "../../../../engine/core/IgeSceneGraph";
import { GameEntity } from "../component/GameEntity";
import { IgeNetworkServerSideMessageHandler, IgeNetworkServerSideRequestHandler } from "../../../../types/IgeNetworkMessage";
import { IgeNetIoSocket } from "../../../../engine/network/server/IgeNetIoSocket";
import { EntityModuleDefinition } from "../../types/EntityModuleDefinition";
import { EntityAbilityModuleDefinition } from "../../types/EntityAbilityModuleDefinition";
export interface ServerPublicGameData {
    modules: Record<string, EntityModuleDefinition | EntityAbilityModuleDefinition>;
}
export declare class SpaceServerScene extends IgeSceneGraph {
    classId: string;
    publicGameData: ServerPublicGameData;
    players: Record<string, GameEntity>;
    constructor();
    addGraph(): void;
    removeGraph(): void;
    playerByClientId(clientId: string, player?: GameEntity): GameEntity | this;
    /**
     * Is called when the network tells us a new client has connected
     * to the server. This is the point we can return true to reject
     * the client connection if we wanted to.
     * @param socket The client socket object.
     * @private
     */
    _onPlayerConnect(socket: IgeNetIoSocket): boolean;
    /**
     * Called when a client disconnects.
     * @param {String} clientId The client network id.
     * @private
     */
    _onPlayerDisconnect(clientId: string): void;
    _onPublicGameData: IgeNetworkServerSideRequestHandler;
    /**
     * Is called when a network packet with the "playerEntity" command
     * is received by the server. This is the client asking for a player entity.
     * @param {Object} data The data object that contains any data sent from the client.
     * @param {String} clientId The id of the client that sent the command.
     * @private
     */
    _onPlayerEntity: IgeNetworkServerSideMessageHandler;
    _onMiningStartRequest: IgeNetworkServerSideRequestHandler;
    _onAbilityUseRequest: IgeNetworkServerSideMessageHandler;
    _onPlayerControlChange: IgeNetworkServerSideMessageHandler;
}
