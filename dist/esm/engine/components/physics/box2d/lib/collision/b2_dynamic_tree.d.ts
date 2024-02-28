import type { XY } from "../common/b2_math.js"
import { b2Vec2 } from "../common/b2_math.js"
import { b2GrowableStack } from "../common/b2_growable_stack.js"
import { b2AABB, b2RayCastInput } from "./b2_collision.js"
export declare class b2TreeNode<T> {
    readonly m_id: number;
    readonly aabb: b2AABB;
    private _userData;
    get userData(): T;
    set userData(value: T);
    parent: b2TreeNode<T> | null;
    child1: b2TreeNode<T> | null;
    child2: b2TreeNode<T> | null;
    height: number;
    moved: boolean;
    constructor(id?: number);
    Reset(): void;
    IsLeaf(): boolean;
}
export declare class b2DynamicTree<T> {
    m_root: b2TreeNode<T> | null;
    m_freeList: b2TreeNode<T> | null;
    m_insertionCount: number;
    readonly m_stack: b2GrowableStack<b2TreeNode<T> | null>;
    static readonly s_r: b2Vec2;
    static readonly s_v: b2Vec2;
    static readonly s_abs_v: b2Vec2;
    static readonly s_segmentAABB: b2AABB;
    static readonly s_subInput: b2RayCastInput;
    static readonly s_combinedAABB: b2AABB;
    static readonly s_aabb: b2AABB;
    Query(aabb: b2AABB, callback: (node: b2TreeNode<T>) => boolean): void;
    QueryPoint(point: XY, callback: (node: b2TreeNode<T>) => boolean): void;
    RayCast(input: b2RayCastInput, callback: (input: b2RayCastInput, node: b2TreeNode<T>) => number): void;
    static s_node_id: number;
    AllocateNode(): b2TreeNode<T>;
    FreeNode(node: b2TreeNode<T>): void;
    CreateProxy(aabb: b2AABB, userData: T): b2TreeNode<T>;
    DestroyProxy(node: b2TreeNode<T>): void;
    private static MoveProxy_s_fatAABB;
    private static MoveProxy_s_hugeAABB;
    MoveProxy(node: b2TreeNode<T>, aabb: b2AABB, displacement: b2Vec2): boolean;
    InsertLeaf(leaf: b2TreeNode<T>): void;
    RemoveLeaf(leaf: b2TreeNode<T>): void;
    Balance(A: b2TreeNode<T>): b2TreeNode<T>;
    GetHeight(): number;
    private static GetAreaNode;
    GetAreaRatio(): number;
    static ComputeHeightNode<T>(node: b2TreeNode<T> | null): number;
    ComputeHeight(): number;
    ValidateStructure(node: b2TreeNode<T> | null): void;
    ValidateMetrics(node: b2TreeNode<T> | null): void;
    Validate(): void;
    private static GetMaxBalanceNode;
    GetMaxBalance(): number;
    RebuildBottomUp(): void;
    private static ShiftOriginNode;
    ShiftOrigin(newOrigin: XY): void;
}
