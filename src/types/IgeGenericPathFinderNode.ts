import type { IgePathFinderListType } from "@/enums/IgePathFinderListType";
import type { IgeCanId } from "@/types/IgeCanId";

export interface IgeGenericPathFinderNode<DataType extends IgeCanId> {
	_id: string;
	data: DataType;
	cost?: number; // If set to undefined, the cost must be calculated
	listType?: IgePathFinderListType;
	link?: IgeGenericPathFinderNode<DataType> | null;
}
