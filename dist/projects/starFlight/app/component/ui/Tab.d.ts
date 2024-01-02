import { IgeUiEntity } from "../../../../../engine/core/IgeUiEntity.js"
import { IgeUiLabel } from "../../../../../engine/ui/IgeUiLabel.js"
export declare class Tab extends IgeUiEntity {
    classId: string;
    _slideVal: number;
    _label: IgeUiLabel;
    _tabOptions: Record<string, any>;
    constructor(options: Record<string, any>);
}
