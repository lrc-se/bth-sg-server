/**
 * MongoDB repository.
 *
 * @module  services/db-repository
 */

"use strict";

const dbConnection = require("./db-connection");
const Id = require("mongodb").ObjectID;


/**
 * Repository object prototype.
 */
const repoProto = {
    /**
     * Underlying MongoDB connection.
     *
     * @type    {mongodb.Db}
     */
    connection: null,
    
    
    /**
     * Underlying MongoDB collection.
     *
     * @type    {mongodb.Collection}
     */
    collection: null,
    
    
    /**
     * Finds a document by key.
     *
     * @param   {string}    key     Field name (pass null to use primary key).
     * @param   {any}       value   Field value.
     *
     * @returns {Promise}           Promise with retrieved document as value.
     */
    find: function find(key, value) {
        let query;
        if (key) {
            query = {};
            query[key] = value;
        } else {
            if (Id.isValid(value)) {
                query = Id(value);
            } else {
                return Promise.resolve(null);
            }
        }
        
        return this.collection.findOne(query);
    },
    
    
    /**
     * Retrieves all documents that match a query.
     *
     * @param   {object}    [query]         Query object.
     * @param   {boolean}   [fetch]         Whether to fetch the results into memory.
     *
     * @returns {mongodb.Cursor|Promise}    Cursor object or Promise with array of fetched 
     *                                      documents as value.
     */
    retrieve: function retrieve(query, fetch) {
        let cursor = this.collection.find(query);
        return (fetch ? cursor.toArray() : cursor);
    },
    
    
    /**
     * Saves a document to database, inserting if it does not exist and updating if it does.
     *
     * @param   {object}    obj     Document to save.
     *
     * @returns {Promise}           Promise with operation result object as value.
     */
    save: function save(obj) {
        if (obj._id) {
            let props = {};
            Object.assign(props, obj);
            delete props._id;
            return this.collection.updateOne({ _id: Id(obj._id) }, { $set: props });
        } else {
            return this.collection.insertOne(obj);
        }
    },
    
    
    /**
     * Removes a document from database.
     *
     * @param   {object}    obj     Document to remove.
     *
     * @returns {Promise}           Promise with operation result object as value.
     */
    remove: function remove(obj) {
        return this.collection.deleteOne({ _id: Id(obj._id) }).then(function(res) {
            if (res.deletedCount == 1) {
                delete obj._id;
            }
            return res;
        });
    },
    
    
    /**
     * Counts documents that match a query.
     *
     * @param   {object}    [query]     Query object.
     *
     * @returns {Promise}               Promise with document count as value.
     */
    count: function count(query) {
        return this.collection.count(query);
    }
};


/**
 * Loads a collection from database and binds a new repository to it.
 *
 * @param   {string}    name    Collection name.
 *
 * @returns {Promise}           Promise with repository object as value.
 */
function loadCollection(name) {
    let conn = dbConnection();
    return conn.connect().then(db => db.collection(name)).then(function(coll) {
        let repo = Object.create(repoProto);
        repo.connection = conn;
        repo.collection = coll;
        return repo;
    });
}


module.exports = loadCollection;
