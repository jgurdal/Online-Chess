/**
 * createConnection.js    - A program to create a connection to MySQL connection.
 * @author        Andrew Sarmiento
 * @author
 * @author
 * @date          7/19/2019
 *
 * @description
 *
 */

const mysql = require("mysql");

function createConnection() {
  // Create a database Connection
  let connection = mysql.createConnection({
    // AWS RDS
    host: 'chessdb.cabihvrofnfu.us-west-1.rds.amazonaws.com',
    user: 'root',
    password: 'Team7isthebestteam',
    database: 'csc667teamchess',
    // multipleStatements: true
    // host: "localhost",
    // user: "root",
    // password: "",
    // //database: '',      /** uncomment it if creating database for the first time */
  });

  // Connect to MySQL
  connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected to MySQL database successfully...");
  });
  return connection;
} // end createConnection()

// Export Module
module.exports = createConnection;
