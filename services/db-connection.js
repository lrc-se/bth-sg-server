/**
 * MongoDB database connection.
 *
 * @module  services/db-connection
 */

"use strict";

const mongo = require("mongodb").MongoClient;


// default connection strings
const defaultDsn = process.env.DBWEBB_DSN || "mongodb://localhost:27017/ramverk2";


/**
 * Connection object prototype.
 */
const dbProto = {
    /**
     * Connection string.
     *
     * @type    {string}
     */
    dsn: null,
    
    
    /**
     * Cached connection.
     *
     * @type    {mongodb.Db}
     */
    db: null,
    
    
    /**
     * Connects to database, or reuses existing connection if available.
     *
     * @returns {Promise}   Promise with active connection as value.
     */
    connect: function connect() {
        let obj = this;
        if (obj.db) {
            return Promise.resolve(obj.db);
        }
        
        return mongo.connect(obj.dsn).then(function(db) {
            // cache connection for subsequent requests
            obj.db = db;
            return db;
        });
    },
    
    
    /**
     * Disconnects from database.
     *
     * @returns {Promise}
     */
    close: function close() {
        if (this.db) {
            return this.db.close();
        }
        
        return Promise.resolve();
    }
};


/**
 * Creates a new connection object.
 *
 * @param   {string}    [dsn]   Connection string.
 *
 * @returns {object}            Connection object.
 */
function create(dsn) {
    let conn = Object.create(dbProto);
    conn.dsn = dsn || defaultDsn;
    return conn;
}


module.exports = create;
