import type { IgeCanIndexItems } from "../../types/IgeCanIndexItems.js"
import type { IgeIndexTreeNode } from "../../types/IgeIndexTreeNode.js"
/**
 * An implementation of a tree index similar to a binary tree but is not binary,
 * can have any number of branches. I've created this to support the quadHash
 * location hashing util I wrote earlier. This will allow for a very performant
 * spatial mapping system that could be used to do dirty rectangle detection,
 * collision detection or any number of other interesting things.
 */
export declare class IgeIndexTree<ValueType = any> implements IgeCanIndexItems<ValueType> {
    _encodingPrecision: number;
    _tree: IgeIndexTreeNode;
    encodeHash: ([x1, y1, z1]: number[], level?: number) => string;
    decodeHash: (hash: string) => number[];
    /**
     * Gets the current hash for a given value.
     */
    /**
     * Sets the location for a given value. This takes the given
     * location, encodes it as a hash and then adds it to the index.
     */
    set(value: ValueType, location: number[]): boolean;
    /**
     * Removes the given value from the index.
     * @param value
     */
    remove(value: ValueType): boolean;
    getBranchFromHash(hash: string, currentNode?: IgeIndexTreeNode<any>): IgeIndexTreeNode | null;
    /**
     * Gets all the values that fall under a given hash. Providing
     * a general hash value will retrieve more results. The more
     * specific a hash, the more specific the results.
     *
     * Providing a value of "" will result in all values in the index
     * being returned.
     * @param hash
     */
    getValues(hash: string): ValueType[];
    getBranchValues(tree?: IgeIndexTreeNode): ValueType[];
}
