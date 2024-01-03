import { b2Vec2, XY } from "../common/b2_math.js"
import { b2AABB, b2RayCastInput } from "./b2_collision.js"
import { b2TreeNode, b2DynamicTree } from "./b2_dynamic_tree.js"
export declare class b2Pair<T> {
    proxyA: b2TreeNode<T>;
    proxyB: b2TreeNode<T>;
    constructor(proxyA: b2TreeNode<T>, proxyB: b2TreeNode<T>);
}
export declare class b2BroadPhase<T> {
    readonly m_tree: b2DynamicTree<T>;
    m_proxyCount: number;
    m_moveCount: number;
    readonly m_moveBuffer: Array<b2TreeNode<T> | null>;
    m_pairCount: number;
    readonly m_pairBuffer: Array<b2Pair<T>>;
    CreateProxy(aabb: b2AABB, userData: T): b2TreeNode<T>;
    DestroyProxy(proxy: b2TreeNode<T>): void;
    MoveProxy(proxy: b2TreeNode<T>, aabb: b2AABB, displacement: b2Vec2): void;
    TouchProxy(proxy: b2TreeNode<T>): void;
    GetProxyCount(): number;
    UpdatePairs(callback: (a: T, b: T) => void): void;
    Query(aabb: b2AABB, callback: (node: b2TreeNode<T>) => boolean): void;
    QueryPoint(point: XY, callback: (node: b2TreeNode<T>) => boolean): void;
    RayCast(input: b2RayCastInput, callback: (input: b2RayCastInput, node: b2TreeNode<T>) => number): void;
    GetTreeHeight(): number;
    GetTreeBalance(): number;
    GetTreeQuality(): number;
    ShiftOrigin(newOrigin: XY): void;
    BufferMove(proxy: b2TreeNode<T>): void;
    UnBufferMove(proxy: b2TreeNode<T>): void;
}
