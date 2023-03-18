declare var IgeMySql: {
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
     * Disconnect from the current mysql connection.
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
     * Query the database with SQL and return the result
     * via the callback method.
     * @param query
     * @param callback
     */
    query: (query: any, callback: any) => void;
    /**
     * Executes a select query with the JSON object properties
     * as column names and their values as the where clause.
     * @param coll
     * @param json
     * @param callback
     */
    findAll: (coll: any, json: any, callback: any) => void;
    /**
     * Inserts a new row into the database.
     * @param coll The collection name to insert the row into.
     * @param json The JSON data to insert. Must be wrapped in an array to
     * work e.g. [{myData: true}]
     * @param callback A callback method to call once the insert is complete.
     */
    insert: (coll: any, json: any, callback: any) => void;
    remove: (coll: any, json: any, callback: any) => void;
    idToCollectionId: (coll: any, obj: any) => void;
    collectionIdToId: (coll: any, obj: any) => void;
};
