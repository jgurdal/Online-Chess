/*

This is something we can integrate in our final project, NOT required for our current checkpoint


***Why we should pool our database connections***

https://stackoverflow.com/questions/20712417/why-are-database-connection-pools-better-than-a-single-connection/20712571
https://en.wikipedia.org/wiki/Connection_pool



***Pooling documentation***

https://www.npmjs.com/package/mysql#pooling-connections

*/

const mysql = require("mysql");

const config = {
	//can be altered
	connectionLimit: 10,
	host: "chessdb.cabihvrofnfu.us-west-1.rds.amazonaws.com",
    user: "root",
    password: "Team7isthebestteam",
    database: "csc667teamchess"
};

const pool = msql.createPool(config);

module.exports = pool;

//In ../app.js, we would create one pool using db = pool through which we would manage all our connections
//To close the pool we would call pool.end() once at the end of the program as opposed to closing every open connection 
