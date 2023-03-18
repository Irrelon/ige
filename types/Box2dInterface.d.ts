interface IMath {
}
interface ICommon {
    Math: IMath;
}
interface IShapes {
}
interface ICollision {
    IBroadPhase: "Box2D.Collision.IBroadPhase";
    Shapes: IShapes;
}
interface IContracts {
}
interface IControllers {
}
interface IJoints {
}
interface IDynamics {
    Contacts: IContracts;
    Controllers: IControllers;
    Joints: IJoints;
}
export interface IBox2D {
    NVector: (length: number) => number[];
    Collision: ICollision;
    Common: ICommon;
    Dynamics: IDynamics;
}
export {};
