declare var IgeMongoDb: {
    /**
     * Set the current settings for the database connection. This should
     * be called before any call to connect().
     * @param params
     */
    settings: (params: any) => void;
    /**
     * Connect to the database with the current settings.
     * @param callback
     */
    connect: (callback: any) => void;
    /**
     * Disconnect from the current mongo connection.
     * @param callback
     */
    disconnect: (callback: any) => void;
    /**
     * Called by the connect() method once a connection has been established
     * or a connection error occurs.
     * @param err
     * @param db
     * @param callback
     * @private
     */
    _connected: (err: any, db: any, callback: any) => void;
    /**
     * Inserts a new row into the database.
     * @param {String} coll The collection name to operate on.
     * @param {Object} json The JSON data to insert. Must be wrapped in an array to
     * work e.g. [{myData: true}]
     * @param {Function} callback The method to call once the DB operation
     * has been completed.
     */
    insert: (coll: any, json: any, callback: any) => void;
    /**
     * Removes all rows that match the passed criteria.
     * @param {String} coll The collection name to operate on.
     * @param {Object} json The object containing the fields that a record
     * must match to be removed.
     * @param {Function} callback The method to call once the DB operation
     * has been completed.
     */
    remove: (coll: any, json: any, callback: any) => void;
    /**
     * Finds all records matching the search object and returns them as an array.
     * @param {String} coll The collection name to operate on.
     * @param {Object} json The object containing the fields that a record
     * must match to be returned by the find operation.
     * @param {Function} callback The method to call once the DB operation
     * has been completed.
     */
    findAll: (coll: any, json: any, callback: any) => void;
    /**
     * Performs a database update operation which will only update the fields
     * of records that match the searchJson object fields, with the corresponding
     * fields in the updateJson object. It will NOT overwrite the updated document
     * with only the fields in the updateJson object.
     * @param {String} coll The collection name to operate on.
     * @param {Object} searchJson The object containing the fields
     * that a record must match to be updated.
     * @param updateJson The object containing the fields to update
     * matching records with.
     * @param {Function} callback The method to call once the DB operation
     * has been completed.
     * @param {Object} options The options object containing three boolean
     * values: safe, multi and upsert. See the MongoDB docs for more information.
     */
    update: (coll: any, searchJson: any, updateJson: any, callback: any, options: any) => void;
    /**
     * Performs a database update operation which overwrites any matching documents
     * with the document in the overwriteJson argument.
     * @param {String} coll The collection name to operate on.
     * @param {Object} searchJson The object containing the fields
     * that a record must match to be updated.
     * @param overwriteJson The object containing the fields to overwrite
     * matching records with.
     * @param {Function} callback The method to call once the DB operation
     * has been completed.
     * @param {Object} options The options object containing three boolean
     * values: safe, multi and upsert. See the MongoDB docs for more information.
     */
    overwrite: (coll: any, searchJson: any, overwriteJson: any, callback: any, options: any) => void;
    /**
     * MongoDB specific - Finds the _id field returned by the database and
     * renames it to COLL_id where COLL = collection name e.g. with data from the "test" collection
     * the resulting object would have its ID stored in the field called test_id. This is very
     * useful when making Mongo data compatible with other databases whose tables will usually have
     * their ID (primary key) fields in the format of tableName_dbId.
     * @param coll
     * @param obj
     */
    idToCollectionId: (coll: any, obj: any) => void;
    /**
     * MongoDB specific - Reverse of the idToCollectionId method.
     * @param coll
     * @param obj
     */
    collectionIdToId: (coll: any, obj: any) => void;
};
