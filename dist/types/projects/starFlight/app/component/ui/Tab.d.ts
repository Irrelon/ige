import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
export declare class Tab extends IgeUiEntity {
    classId: string;
    _slideVal: number;
    _label: IgeUiLabel;
    _tabOptions: Record<string, any>;
    constructor(options: Record<string, any>);
}
