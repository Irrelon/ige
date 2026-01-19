import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import { IgeEntity } from "../../engine/core/IgeEntity.js"
import { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import { IgeViewport } from "../../engine/core/IgeViewport.js"
import { IgeCamera } from "../../engine/core/IgeCamera.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    scene?: IgeScene2d;
    camera?: IgeCamera;
    viewport?: IgeViewport;
    entities: IgeEntity[];
    rotationSpeeds: number[];
    isPerspective: boolean;
    constructor();
    init(): Promise<void>;
    setupScene(): void;
    createTestEntities(): void;
    setupCameraAnimation(): void;
    setupKeyboardControls(): void;
    updateStatus(status: string): void;
    updateStats(): void;
    hideLoadingScreen(): void;
}
