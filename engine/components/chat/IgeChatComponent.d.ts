import IgeComponent from "../../core/IgeComponent";
export type IgeChatRoomOptions = Record<string, any>;
export interface IgeChatRoom {
    id: string;
    name: string;
    options?: IgeChatRoomOptions;
    users: string[];
}
export declare class IgeChatComponent extends IgeComponent {
    classId: string;
    componentId: string;
    _rooms: Record<string, IgeChatRoom>;
}
