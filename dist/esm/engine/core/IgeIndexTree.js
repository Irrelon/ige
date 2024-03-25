import { decode, encode } from "../utils/octaHash.js"
/**
 * An implementation of a tree index similar to a binary tree but is not binary,
 * can have any number of branches. I've created this to support the quadHash
 * location hashing util I wrote earlier. This will allow for a very performant
 * spatial mapping system that could be used to do dirty rectangle detection,
 * collision detection or any number of other interesting things.
 */
export class IgeIndexTree {
    _encodingPrecision = 6;
    _tree = {
        id: "",
        values: [],
        branches: {}
    };
    encodeHash = encode;
    decodeHash = decode;
    /**
     * Gets the current hash for a given value.
     */
    // get (value: ValueType, currentNode: IgeIndexTreeNode = this._tree) {
    // 	// Walk the tree and find the hash this value belongs to
    // 	for (const branch in currentNode.branches) {
    // 		if (currentNode.branches[branch].values.indexOf(value) !== -1) {
    // 			return currentNode.branches[branch].id;
    // 		}
    //
    // 		this.get(value, currentNode
    // 	}
    //
    // 	return "";
    // }
    /**
     * Sets the location for a given value. This takes the given
     * location, encodes it as a hash and then adds it to the index.
     */
    set(value, location) {
        let id = "";
        const locationHash = this.encodeHash(location, this._encodingPrecision);
        let currentNode = this._tree;
        for (let i = 0; i < locationHash.length; i++) {
            const branch = locationHash[i];
            id += branch;
            currentNode.branches[branch] = currentNode.branches[branch] || {
                id,
                values: [],
                branches: {}
            };
            currentNode = currentNode.branches[branch];
        }
        currentNode.values.push(value);
        return true;
    }
    /**
     * Removes the given value from the index.
     * @param value
     */
    remove(value) {
        return true;
    }
    getBranchFromHash(hash, currentNode = this._tree) {
        for (let i = 0; i < hash.length; i++) {
            const branch = hash[i];
            if (!currentNode.branches[branch]) {
                return null;
            }
            currentNode = currentNode.branches[branch];
        }
        return currentNode;
    }
    /**
     * Gets all the values that fall under a given hash. Providing
     * a general hash value will retrieve more results. The more
     * specific a hash, the more specific the results.
     *
     * Providing a value of "" will result in all values in the index
     * being returned.
     * @param hash
     */
    getValues(hash) {
        const branch = this.getBranchFromHash(hash);
        if (!branch)
            return [];
        return this.getBranchValues(branch);
    }
    getBranchValues(tree = this._tree) {
        // Walk the branch down all it's sub-branches and
        // gather all the values for each branch, then return
        // them as an array
        const values = [...tree.values];
        for (const branch in tree.branches) {
            const branchValues = this.getBranchValues(tree.branches[branch]);
            values.push(...branchValues);
        }
        return values;
    }
}
