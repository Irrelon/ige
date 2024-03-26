"use strict";
/*
* Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2BroadPhase = exports.b2Pair = void 0;
const b2_dynamic_tree_1 = require("./b2_dynamic_tree");
class b2Pair {
    constructor(proxyA, proxyB) {
        this.proxyA = proxyA;
        this.proxyB = proxyB;
    }
}
exports.b2Pair = b2Pair;
/// The broad-phase is used for computing pairs and performing volume queries and ray casts.
/// This broad-phase does not persist pairs. Instead, this reports potentially new pairs.
/// It is up to the client to consume the new pairs and to track subsequent overlap.
class b2BroadPhase {
    constructor() {
        this.m_tree = new b2_dynamic_tree_1.b2DynamicTree();
        this.m_proxyCount = 0;
        // public m_moveCapacity: number = 16;
        this.m_moveCount = 0;
        this.m_moveBuffer = [];
        // public m_pairCapacity: number = 16;
        this.m_pairCount = 0;
        this.m_pairBuffer = [];
    }
    // public m_queryProxyId: number = 0;
    /// Create a proxy with an initial AABB. Pairs are not reported until
    /// UpdatePairs is called.
    CreateProxy(aabb, userData) {
        const proxy = this.m_tree.CreateProxy(aabb, userData);
        ++this.m_proxyCount;
        this.BufferMove(proxy);
        return proxy;
    }
    /// Destroy a proxy. It is up to the client to remove any pairs.
    DestroyProxy(proxy) {
        this.UnBufferMove(proxy);
        --this.m_proxyCount;
        this.m_tree.DestroyProxy(proxy);
    }
    /// Call MoveProxy as many times as you like, then when you are done
    /// call UpdatePairs to finalized the proxy pairs (for your time step).
    MoveProxy(proxy, aabb, displacement) {
        const buffer = this.m_tree.MoveProxy(proxy, aabb, displacement);
        if (buffer) {
            this.BufferMove(proxy);
        }
    }
    /// Call to trigger a re-processing of it's pairs on the next call to UpdatePairs.
    TouchProxy(proxy) {
        this.BufferMove(proxy);
    }
    /// Get the fat AABB for a proxy.
    // public GetFatAABB(proxy: b2TreeNode<T>): b2AABB {
    //   return this.m_tree.GetFatAABB(proxy);
    // }
    /// Get user data from a proxy. Returns NULL if the id is invalid.
    // public GetUserData(proxy: b2TreeNode<T>): T {
    //   return this.m_tree.GetUserData(proxy);
    // }
    /// Test overlap of fat AABBs.
    // public TestOverlap(proxyA: b2TreeNode<T>, proxyB: b2TreeNode<T>): boolean {
    //   const aabbA: b2AABB = this.m_tree.GetFatAABB(proxyA);
    //   const aabbB: b2AABB = this.m_tree.GetFatAABB(proxyB);
    //   return b2TestOverlapAABB(aabbA, aabbB);
    // }
    /// Get the number of proxies.
    GetProxyCount() {
        return this.m_proxyCount;
    }
    /// Update the pairs. This results in pair callbacks. This can only add pairs.
    UpdatePairs(callback) {
        // Reset pair buffer
        this.m_pairCount = 0;
        // Perform tree queries for all moving proxies.
        for (let i = 0; i < this.m_moveCount; ++i) {
            const queryProxy = this.m_moveBuffer[i];
            if (queryProxy === null) {
                continue;
            }
            // This is called from b2.DynamicTree::Query when we are gathering pairs.
            // boolean b2BroadPhase::QueryCallback(int32 proxyId);
            // We have to query the tree with the fat AABB so that
            // we don't fail to create a pair that may touch later.
            const fatAABB = queryProxy.aabb; // this.m_tree.GetFatAABB(queryProxy);
            // Query tree, create pairs and add them pair buffer.
            this.m_tree.Query(fatAABB, (proxy) => {
                // A proxy cannot form a pair with itself.
                if (proxy.m_id === queryProxy.m_id) {
                    return true;
                }
                const moved = proxy.moved; // this.m_tree.WasMoved(proxy);
                if (moved && proxy.m_id > queryProxy.m_id) {
                    // Both proxies are moving. Avoid duplicate pairs.
                    return true;
                }
                // const proxyA = proxy < queryProxy ? proxy : queryProxy;
                // const proxyB = proxy >= queryProxy ? proxy : queryProxy;
                let proxyA;
                let proxyB;
                if (proxy.m_id < queryProxy.m_id) {
                    proxyA = proxy;
                    proxyB = queryProxy;
                }
                else {
                    proxyA = queryProxy;
                    proxyB = proxy;
                }
                // Grow the pair buffer as needed.
                if (this.m_pairCount === this.m_pairBuffer.length) {
                    this.m_pairBuffer[this.m_pairCount] = new b2Pair(proxyA, proxyB);
                }
                else {
                    const pair = this.m_pairBuffer[this.m_pairCount];
                    pair.proxyA = proxyA;
                    pair.proxyB = proxyB;
                }
                ++this.m_pairCount;
                return true;
            });
        }
        // Send pairs to caller
        for (let i = 0; i < this.m_pairCount; ++i) {
            const primaryPair = this.m_pairBuffer[i];
            const userDataA = primaryPair.proxyA.userData; // this.m_tree.GetUserData(primaryPair.proxyA);
            const userDataB = primaryPair.proxyB.userData; // this.m_tree.GetUserData(primaryPair.proxyB);
            callback(userDataA, userDataB);
        }
        // Clear move flags
        for (let i = 0; i < this.m_moveCount; ++i) {
            const proxy = this.m_moveBuffer[i];
            if (proxy === null) {
                continue;
            }
            proxy.moved = false; // this.m_tree.ClearMoved(proxy);
        }
        // Reset move buffer
        this.m_moveCount = 0;
    }
    /// Query an AABB for overlapping proxies. The callback class
    /// is called for each proxy that overlaps the supplied AABB.
    Query(aabb, callback) {
        this.m_tree.Query(aabb, callback);
    }
    QueryPoint(point, callback) {
        this.m_tree.QueryPoint(point, callback);
    }
    /// Ray-cast against the proxies in the tree. This relies on the callback
    /// to perform a exact ray-cast in the case were the proxy contains a shape.
    /// The callback also performs the any collision filtering. This has performance
    /// roughly equal to k * log(n), where k is the number of collisions and n is the
    /// number of proxies in the tree.
    /// @param input the ray-cast input data. The ray extends from p1 to p1 + maxFraction * (p2 - p1).
    /// @param callback a callback class that is called for each proxy that is hit by the ray.
    RayCast(input, callback) {
        this.m_tree.RayCast(input, callback);
    }
    /// Get the height of the embedded tree.
    GetTreeHeight() {
        return this.m_tree.GetHeight();
    }
    /// Get the balance of the embedded tree.
    GetTreeBalance() {
        return this.m_tree.GetMaxBalance();
    }
    /// Get the quality metric of the embedded tree.
    GetTreeQuality() {
        return this.m_tree.GetAreaRatio();
    }
    /// Shift the world origin. Useful for large worlds.
    /// The shift formula is: position -= newOrigin
    /// @param newOrigin the new origin with respect to the old origin
    ShiftOrigin(newOrigin) {
        this.m_tree.ShiftOrigin(newOrigin);
    }
    BufferMove(proxy) {
        this.m_moveBuffer[this.m_moveCount] = proxy;
        ++this.m_moveCount;
    }
    UnBufferMove(proxy) {
        for (let i = 0; i < this.m_moveCount; ++i) {
            if (this.m_moveBuffer[i] === proxy) {
                this.m_moveBuffer[i] = null;
            }
        }
    }
}
exports.b2BroadPhase = b2BroadPhase;
