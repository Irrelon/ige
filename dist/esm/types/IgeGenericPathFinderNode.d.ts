import type { IgePathFinderListType } from "../enums/IgePathFinderListType.js"
import type { IgeCanId } from "./IgeCanId.js"
export interface IgeGenericPathFinderNode<DataType extends IgeCanId> {
    _id: string;
    data: DataType;
    cost?: number;
    listType?: IgePathFinderListType;
    link?: IgeGenericPathFinderNode<DataType> | null;
}
